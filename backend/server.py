from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout,
    CheckoutSessionResponse,
    CheckoutStatusResponse,
    CheckoutSessionRequest,
)

# ---------- MongoDB ----------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"

app = FastAPI(title="LocaShare API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

logger = logging.getLogger("locashare")
logging.basicConfig(level=logging.INFO)


# ---------- Models ----------
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    avatar: Optional[str] = None
    created_at: datetime


class AuthResponse(BaseModel):
    user: UserOut
    access_token: str


class Listing(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    owner_id: str
    title: str
    description: str
    category: str  # car, bike, tool, tech, camping, other
    price_per_day: float
    photos: List[str] = []  # base64 or URLs
    location: dict  # {lat, lng, address}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ListingCreate(BaseModel):
    title: str
    description: str
    category: str
    price_per_day: float
    photos: List[str] = []
    location: dict


class Booking(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    listing_id: str
    renter_id: str
    owner_id: str
    start_date: str  # ISO date
    end_date: str
    days: int
    total_price: float
    status: str = "pending"  # pending, paid, cancelled
    payment_session_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class BookingCreate(BaseModel):
    listing_id: str
    start_date: str
    end_date: str


class CheckoutRequest(BaseModel):
    booking_id: str
    origin_url: str


# ---------- Auth helpers ----------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def serialize_user(user: dict) -> dict:
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "avatar": user.get("avatar"),
        "created_at": user["created_at"],
    }


# ---------- Auth Endpoints ----------
@api_router.post("/auth/register", response_model=AuthResponse)
async def register(payload: UserCreate):
    email = payload.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": payload.name,
        "password_hash": hash_password(payload.password),
        "avatar": None,
        "created_at": datetime.now(timezone.utc),
    }
    await db.users.insert_one(user_doc)
    token = create_access_token(user_doc["id"], email)
    return {"user": serialize_user(user_doc), "access_token": token}


@api_router.post("/auth/login", response_model=AuthResponse)
async def login(payload: UserLogin):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(user["id"], email)
    return {"user": serialize_user(user), "access_token": token}


@api_router.get("/auth/me", response_model=UserOut)
async def me(current_user: dict = Depends(get_current_user)):
    return serialize_user(current_user)


# ---------- Listings ----------
@api_router.get("/listings")
async def list_listings(category: Optional[str] = None, q: Optional[str] = None):
    query = {}
    if category and category != "all":
        query["category"] = category
    if q:
        query["title"] = {"$regex": q, "$options": "i"}
    items = await db.listings.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    # attach owner basic info
    for item in items:
        owner = await db.users.find_one({"id": item["owner_id"]}, {"_id": 0, "password_hash": 0})
        item["owner"] = (
            {"id": owner["id"], "name": owner["name"], "avatar": owner.get("avatar")}
            if owner else None
        )
    return items


@api_router.get("/listings/{listing_id}")
async def get_listing(listing_id: str):
    item = await db.listings.find_one({"id": listing_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Listing not found")
    owner = await db.users.find_one({"id": item["owner_id"]}, {"_id": 0, "password_hash": 0})
    item["owner"] = (
        {"id": owner["id"], "name": owner["name"], "avatar": owner.get("avatar"),
         "created_at": owner["created_at"]}
        if owner else None
    )
    return item


@api_router.post("/listings")
async def create_listing(
    payload: ListingCreate, current_user: dict = Depends(get_current_user)
):
    listing = Listing(owner_id=current_user["id"], **payload.dict())
    await db.listings.insert_one(listing.dict())
    return listing.dict()


@api_router.get("/listings/owner/me")
async def my_listings(current_user: dict = Depends(get_current_user)):
    items = await db.listings.find(
        {"owner_id": current_user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    return items


@api_router.delete("/listings/{listing_id}")
async def delete_listing(listing_id: str, current_user: dict = Depends(get_current_user)):
    res = await db.listings.delete_one({"id": listing_id, "owner_id": current_user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Listing not found")
    return {"ok": True}


# ---------- Bookings ----------
@api_router.post("/bookings")
async def create_booking(
    payload: BookingCreate, current_user: dict = Depends(get_current_user)
):
    listing = await db.listings.find_one({"id": payload.listing_id}, {"_id": 0})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing["owner_id"] == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot book your own listing")

    start = datetime.fromisoformat(payload.start_date)
    end = datetime.fromisoformat(payload.end_date)
    days = max(1, (end - start).days + 1)
    total = round(days * float(listing["price_per_day"]), 2)

    booking = Booking(
        listing_id=payload.listing_id,
        renter_id=current_user["id"],
        owner_id=listing["owner_id"],
        start_date=payload.start_date,
        end_date=payload.end_date,
        days=days,
        total_price=total,
    )
    await db.bookings.insert_one(booking.dict())
    return booking.dict()


@api_router.get("/bookings/me")
async def my_bookings(current_user: dict = Depends(get_current_user)):
    items = await db.bookings.find(
        {"renter_id": current_user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    for b in items:
        l = await db.listings.find_one({"id": b["listing_id"]}, {"_id": 0})
        b["listing"] = l
    return items


# ---------- Stripe Checkout ----------
@api_router.post("/checkout/session")
async def create_checkout(
    payload: CheckoutRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    booking = await db.bookings.find_one({"id": payload.booking_id}, {"_id": 0})
    if not booking or booking["renter_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Booking not found")

    amount = float(booking["total_price"])
    api_key = os.environ["STRIPE_API_KEY"]
    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)

    success_url = f"{payload.origin_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{payload.origin_url}/payment-cancel"

    session_req = CheckoutSessionRequest(
        amount=amount,
        currency="eur",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "booking_id": booking["id"],
            "user_id": current_user["id"],
        },
    )
    session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(session_req)

    await db.payment_transactions.insert_one({
        "session_id": session.session_id,
        "booking_id": booking["id"],
        "user_id": current_user["id"],
        "amount": amount,
        "currency": "eur",
        "status": "initiated",
        "payment_status": "unpaid",
        "metadata": {"booking_id": booking["id"]},
        "created_at": datetime.now(timezone.utc),
    })

    await db.bookings.update_one(
        {"id": booking["id"]}, {"$set": {"payment_session_id": session.session_id}}
    )

    return {"url": session.url, "session_id": session.session_id}


@api_router.get("/checkout/status/{session_id}")
async def checkout_status(session_id: str, request: Request):
    api_key = os.environ["STRIPE_API_KEY"]
    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)

    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if tx and tx["payment_status"] != "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"status": status.status, "payment_status": status.payment_status}},
        )
        if status.payment_status == "paid":
            await db.bookings.update_one(
                {"payment_session_id": session_id}, {"$set": {"status": "paid"}}
            )

    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency,
    }


@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    api_key = os.environ["STRIPE_API_KEY"]
    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    sig = request.headers.get("Stripe-Signature", "")
    try:
        event = await stripe_checkout.handle_webhook(body, sig)
        if event.payment_status == "paid":
            await db.payment_transactions.update_one(
                {"session_id": event.session_id},
                {"$set": {"payment_status": "paid", "status": "complete"}},
            )
            await db.bookings.update_one(
                {"payment_session_id": event.session_id}, {"$set": {"status": "paid"}}
            )
    except Exception as e:
        logger.error(f"Webhook error: {e}")
    return {"received": True}


# ---------- Categories ----------
@api_router.get("/categories")
async def get_categories():
    return [
        {"id": "all", "label": "Tout", "icon": "grid-outline"},
        {"id": "car", "label": "Voitures", "icon": "car-outline"},
        {"id": "bike", "label": "Vélos", "icon": "bicycle-outline"},
        {"id": "tool", "label": "Outils", "icon": "construct-outline"},
        {"id": "tech", "label": "Tech", "icon": "camera-outline"},
        {"id": "camping", "label": "Camping", "icon": "sunny-outline"},
        {"id": "other", "label": "Autres", "icon": "cube-outline"},
    ]


# ---------- Health ----------
@api_router.get("/")
async def root():
    return {"message": "LocaShare API", "status": "ok"}


# ---------- App setup ----------
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Seed data ----------
SEED_LISTINGS = [
    {
        "title": "Tesla Model 3 - Berline électrique",
        "description": "Voiture électrique premium, autonomie 450km. Idéale pour les longs trajets ou un week-end en amoureux. Recharge rapide incluse.",
        "category": "car",
        "price_per_day": 89.0,
        "photos": ["https://images.pexels.com/photos/24376862/pexels-photo-24376862.jpeg"],
        "location": {"lat": 48.8566, "lng": 2.3522, "address": "Paris 11ème"},
    },
    {
        "title": "VTT électrique Trek",
        "description": "VTT à assistance électrique, parfait pour les randos en forêt et les sorties urbaines. Batterie longue durée 80km.",
        "category": "bike",
        "price_per_day": 25.0,
        "photos": ["https://images.pexels.com/photos/90454/pexels-photo-90454.jpeg"],
        "location": {"lat": 48.8606, "lng": 2.3376, "address": "Paris 1er"},
    },
    {
        "title": "Perceuse Bosch sans fil 18V",
        "description": "Perceuse-visseuse professionnelle avec 2 batteries + chargeur. Parfaite pour vos travaux de bricolage.",
        "category": "tool",
        "price_per_day": 8.0,
        "photos": ["https://images.pexels.com/photos/30413428/pexels-photo-30413428.jpeg"],
        "location": {"lat": 48.8738, "lng": 2.2950, "address": "Paris 17ème"},
    },
    {
        "title": "Tente 4 places Quechua",
        "description": "Tente familiale 4 places, montage rapide en 2 minutes. Utilisée 3 fois, comme neuve.",
        "category": "camping",
        "price_per_day": 15.0,
        "photos": ["https://images.unsplash.com/photo-1624923686627-514dd5e57bae"],
        "location": {"lat": 48.8462, "lng": 2.3464, "address": "Paris 5ème"},
    },
    {
        "title": "Canon EOS R6 + Objectif 24-70mm",
        "description": "Appareil photo hybride plein format. Parfait pour photographier vos voyages, mariages ou shootings pros.",
        "category": "tech",
        "price_per_day": 45.0,
        "photos": ["https://images.pexels.com/photos/51383/photo-camera-subject-photographer-51383.jpeg"],
        "location": {"lat": 48.8848, "lng": 2.3441, "address": "Paris 18ème"},
    },
    {
        "title": "Renault Zoé électrique",
        "description": "Citadine 100% électrique, idéale pour Paris. Autonomie 300km, recharge à domicile possible.",
        "category": "car",
        "price_per_day": 49.0,
        "photos": ["https://images.pexels.com/photos/24376862/pexels-photo-24376862.jpeg"],
        "location": {"lat": 48.8420, "lng": 2.3230, "address": "Paris 14ème"},
    },
    {
        "title": "Vélo de ville Décathlon",
        "description": "Vélo confort 7 vitesses, panier avant et porte-bagage. Idéal pour balades et courses en ville.",
        "category": "bike",
        "price_per_day": 12.0,
        "photos": ["https://images.pexels.com/photos/90454/pexels-photo-90454.jpeg"],
        "location": {"lat": 48.8534, "lng": 2.3488, "address": "Paris 4ème"},
    },
    {
        "title": "GoPro Hero 12 Black",
        "description": "Caméra d'action waterproof avec accessoires (perche, fixations vélo/casque). Pour vos aventures sportives.",
        "category": "tech",
        "price_per_day": 20.0,
        "photos": ["https://images.pexels.com/photos/51383/photo-camera-subject-photographer-51383.jpeg"],
        "location": {"lat": 48.8700, "lng": 2.3100, "address": "Paris 8ème"},
    },
]


@app.on_event("startup")
async def on_startup():
    # indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.listings.create_index("id", unique=True)
    await db.bookings.create_index("id", unique=True)

    # seed demo user
    demo_email = "demo@locashare.fr"
    demo_user = await db.users.find_one({"email": demo_email})
    if not demo_user:
        demo_user = {
            "id": str(uuid.uuid4()),
            "email": demo_email,
            "name": "Sophie Martin",
            "password_hash": hash_password("demo1234"),
            "avatar": None,
            "created_at": datetime.now(timezone.utc),
        }
        await db.users.insert_one(demo_user)

    # seed listings if none
    count = await db.listings.count_documents({})
    if count == 0:
        for seed in SEED_LISTINGS:
            listing = Listing(owner_id=demo_user["id"], **seed)
            await db.listings.insert_one(listing.dict())
        logger.info(f"Seeded {len(SEED_LISTINGS)} demo listings")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
