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
    referral_code: Optional[str] = None


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


class BookingUpdate(BaseModel):
    status: Optional[str] = None  # confirmed, refused, cancelled, paid


class ListingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    price_per_day: Optional[float] = None
    photos: Optional[List[str]] = None
    location: Optional[dict] = None


class MessageCreate(BaseModel):
    to_id: str
    content: str
    listing_id: Optional[str] = None


class ReviewCreate(BaseModel):
    listing_id: str
    rating: int
    comment: Optional[str] = ""
    booking_id: Optional[str] = None


class KYCSubmit(BaseModel):
    document_type: str  # id_card, passport, driving_license
    document_image: str  # base64


class AvailabilityUpdate(BaseModel):
    blocked_dates: List[str] = []  # ISO yyyy-mm-dd


class PushRegister(BaseModel):
    token: str


class ReferralCheck(BaseModel):
    code: str


class UserRegisterExt(BaseModel):
    """Used internally — extends UserCreate with referral_code"""
    email: EmailStr
    password: str
    name: str
    referral_code: Optional[str] = None


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
        "verified": user.get("verified", False),
        "kyc_status": user.get("kyc_status", "none"),
        "referral_code": user.get("referral_code"),
        "credit_balance": user.get("credit_balance", 0),
        "referred_by": user.get("referred_by"),
        "created_at": user["created_at"],
    }


def public_user(user: dict) -> dict:
    return {
        "id": user["id"],
        "name": user["name"],
        "avatar": user.get("avatar"),
        "verified": user.get("verified", False),
        "kyc_status": user.get("kyc_status", "none"),
    }


def gen_referral_code(name: str) -> str:
    base = "".join(c for c in name.upper() if c.isalpha())[:6] or "USER"
    return base + uuid.uuid4().hex[:3].upper()


# ---------- Auth Endpoints ----------
@api_router.post("/auth/register", response_model=AuthResponse)
async def register(payload: UserCreate):
    email = payload.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Référral : crédite parrain + filleul si code valide
    credit_balance = 0
    referred_by = None
    sponsor = None
    if payload.referral_code:
        sponsor = await db.users.find_one({"referral_code": payload.referral_code.upper()})
        if sponsor:
            credit_balance = 10
            referred_by = sponsor["referral_code"]

    user_doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": payload.name,
        "password_hash": hash_password(payload.password),
        "avatar": None,
        "verified": False,
        "kyc_status": "none",
        "referral_code": gen_referral_code(payload.name),
        "credit_balance": credit_balance,
        "referred_by": referred_by,
        "created_at": datetime.now(timezone.utc),
    }
    await db.users.insert_one(user_doc)

    if sponsor:
        # +10€ pour le parrain
        await db.users.update_one(
            {"id": sponsor["id"]},
            {"$inc": {"credit_balance": 10}},
        )
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": sponsor["id"],
            "type": "referral_credit",
            "title": "🎉 Nouveau filleul !",
            "body": f"{payload.name} s'est inscrit avec votre code. +10€ crédités !",
            "data": {"referred_user_id": user_doc["id"]},
            "read": False,
            "created_at": datetime.now(timezone.utc),
        })

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


@api_router.patch("/listings/{listing_id}")
async def update_listing(
    listing_id: str,
    payload: ListingUpdate,
    current_user: dict = Depends(get_current_user),
):
    updates = {k: v for k, v in payload.dict().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")
    res = await db.listings.update_one(
        {"id": listing_id, "owner_id": current_user["id"]}, {"$set": updates}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Listing not found")
    item = await db.listings.find_one({"id": listing_id}, {"_id": 0})
    return item


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
    subtotal = days * float(listing["price_per_day"])
    service_fee = round(subtotal * 0.10, 2)
    total = round(subtotal + service_fee, 2)

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


@api_router.get("/bookings/owner/me")
async def owner_bookings(current_user: dict = Depends(get_current_user)):
    items = await db.bookings.find(
        {"owner_id": current_user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    for b in items:
        l = await db.listings.find_one({"id": b["listing_id"]}, {"_id": 0})
        b["listing"] = l
        renter = await db.users.find_one({"id": b.get("renter_id")}, {"_id": 0, "password_hash": 0})
        b["renter"] = (
            {"id": renter["id"], "name": renter["name"], "avatar": renter.get("avatar")}
            if renter else None
        )
    return items


@api_router.patch("/bookings/{booking_id}")
async def update_booking(
    booking_id: str,
    payload: BookingUpdate,
    current_user: dict = Depends(get_current_user),
):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    # Le propriétaire peut accept/refuse, le locataire peut cancel
    new_status = payload.status
    if new_status in {"confirmed", "refused"} and booking["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only owner can confirm/refuse")
    if new_status == "cancelled" and booking["renter_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only renter can cancel")
    if new_status not in {"confirmed", "refused", "cancelled", "paid", "pending"}:
        raise HTTPException(status_code=400, detail="Invalid status")
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc)}},
    )
    return await db.bookings.find_one({"id": booking_id}, {"_id": 0})


# ---------- Messages ----------
@api_router.post("/messages")
async def send_message(
    payload: MessageCreate, current_user: dict = Depends(get_current_user)
):
    if payload.to_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot message yourself")
    # KYC obligatoire
    if not current_user.get("verified", False):
        raise HTTPException(
            status_code=403,
            detail={
                "detail": "Vérification d'identité requise pour contacter un propriétaire.",
                "code": "KYC_REQUIRED",
                "action": "/verification?reason=message",
            },
        )
    msg = {
        "id": str(uuid.uuid4()),
        "from_id": current_user["id"],
        "to_id": payload.to_id,
        "content": payload.content,
        "listing_id": payload.listing_id,
        "read": False,
        "created_at": datetime.now(timezone.utc),
    }
    await db.messages.insert_one(msg)
    return {**msg, "_id": None}


@api_router.get("/conversations")
async def list_conversations(current_user: dict = Depends(get_current_user)):
    me = current_user["id"]
    # Récupère tous les messages où je participe
    msgs = await db.messages.find(
        {"$or": [{"from_id": me}, {"to_id": me}]}, {"_id": 0}
    ).sort("created_at", -1).to_list(2000)

    by_peer = {}
    for m in msgs:
        peer_id = m["to_id"] if m["from_id"] == me else m["from_id"]
        if peer_id not in by_peer:
            by_peer[peer_id] = m

    convs = []
    for peer_id, last in by_peer.items():
        peer = await db.users.find_one({"id": peer_id}, {"_id": 0, "password_hash": 0})
        unread = await db.messages.count_documents(
            {"from_id": peer_id, "to_id": me, "read": False}
        )
        listing = None
        if last.get("listing_id"):
            listing = await db.listings.find_one(
                {"id": last["listing_id"]}, {"_id": 0, "description": 0}
            )
        convs.append({
            "peer_id": peer_id,
            "peer": {"id": peer["id"], "name": peer["name"], "avatar": peer.get("avatar")} if peer else {"id": peer_id, "name": "Utilisateur", "avatar": None},
            "last_message": last["content"],
            "last_at": last["created_at"],
            "unread": unread,
            "listing": listing,
        })
    convs.sort(key=lambda c: c["last_at"], reverse=True)
    return convs


@api_router.get("/conversations/{peer_id}")
async def get_conversation(peer_id: str, current_user: dict = Depends(get_current_user)):
    me = current_user["id"]
    msgs = await db.messages.find(
        {"$or": [
            {"from_id": me, "to_id": peer_id},
            {"from_id": peer_id, "to_id": me},
        ]},
        {"_id": 0},
    ).sort("created_at", 1).to_list(500)
    # Mark received as read
    await db.messages.update_many(
        {"from_id": peer_id, "to_id": me, "read": False}, {"$set": {"read": True}}
    )
    peer = await db.users.find_one({"id": peer_id}, {"_id": 0, "password_hash": 0})
    return {
        "peer": {"id": peer["id"], "name": peer["name"], "avatar": peer.get("avatar")} if peer else {"id": peer_id, "name": "Utilisateur", "avatar": None},
        "messages": msgs,
    }


@api_router.get("/messages/unread-count")
async def unread_count(current_user: dict = Depends(get_current_user)):
    count = await db.messages.count_documents({"to_id": current_user["id"], "read": False})
    return {"count": count}


# ---------- Reviews ----------
@api_router.get("/reviews/listing/{listing_id}")
async def listing_reviews(listing_id: str):
    items = await db.reviews.find({"listing_id": listing_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    for r in items:
        author = await db.users.find_one({"id": r["author_id"]}, {"_id": 0, "password_hash": 0})
        r["author"] = (
            {"id": author["id"], "name": author["name"], "avatar": author.get("avatar")}
            if author else None
        )
    rating = round(sum(r["rating"] for r in items) / len(items), 1) if items else None
    return {"reviews": items, "rating": rating, "count": len(items)}


@api_router.post("/reviews")
async def create_review(payload: ReviewCreate, current_user: dict = Depends(get_current_user)):
    if payload.rating < 1 or payload.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be 1-5")
    # Check that user has actually rented this listing (paid booking)
    has_booking = await db.bookings.find_one({
        "listing_id": payload.listing_id,
        "renter_id": current_user["id"],
        "status": "paid",
    })
    if not has_booking:
        raise HTTPException(status_code=403, detail="You must have rented this item to review it")
    # One review per user per listing
    existing = await db.reviews.find_one({
        "listing_id": payload.listing_id,
        "author_id": current_user["id"],
    })
    if existing:
        raise HTTPException(status_code=400, detail="You already reviewed this listing")
    review = {
        "id": str(uuid.uuid4()),
        "listing_id": payload.listing_id,
        "booking_id": payload.booking_id,
        "author_id": current_user["id"],
        "rating": payload.rating,
        "comment": payload.comment or "",
        "created_at": datetime.now(timezone.utc),
    }
    await db.reviews.insert_one(review)
    return {**review, "_id": None}


# ---------- KYC / Vérification ----------
@api_router.post("/kyc/submit")
async def kyc_submit(payload: KYCSubmit, current_user: dict = Depends(get_current_user)):
    if payload.document_type not in {"id_card", "passport", "driving_license"}:
        raise HTTPException(status_code=400, detail="Invalid document type")
    if not payload.document_image or len(payload.document_image) < 100:
        raise HTTPException(status_code=400, detail="Invalid image")
    await db.kyc_documents.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "document_type": payload.document_type,
        "document_image": payload.document_image,  # In production: store in S3, save URL only
        "status": "pending",
        "created_at": datetime.now(timezone.utc),
    })
    await db.users.update_one(
        {"id": current_user["id"]}, {"$set": {"kyc_status": "pending"}}
    )
    return {"status": "pending", "message": "Document soumis, vérification sous 24h"}


@api_router.get("/kyc/status")
async def kyc_status(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    return {
        "status": user.get("kyc_status", "none"),
        "verified": user.get("verified", False),
    }


# ---------- Calendrier de disponibilité ----------
@api_router.get("/listings/{listing_id}/availability")
async def listing_availability(listing_id: str):
    listing = await db.listings.find_one({"id": listing_id}, {"_id": 0})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    blocked = listing.get("blocked_dates", [])
    # Dates bloquées par les bookings actifs
    bookings = await db.bookings.find(
        {"listing_id": listing_id, "status": {"$in": ["confirmed", "paid"]}}, {"_id": 0}
    ).to_list(200)
    booked = []
    for b in bookings:
        try:
            start = datetime.fromisoformat(b["start_date"])
            end = datetime.fromisoformat(b["end_date"])
            d = start
            while d <= end:
                booked.append(d.date().isoformat())
                d = d.replace() + timedelta(days=1)
        except Exception:
            pass
    return {"blocked_dates": blocked, "booked_dates": booked}


@api_router.patch("/listings/{listing_id}/availability")
async def update_availability(
    listing_id: str,
    payload: AvailabilityUpdate,
    current_user: dict = Depends(get_current_user),
):
    res = await db.listings.update_one(
        {"id": listing_id, "owner_id": current_user["id"]},
        {"$set": {"blocked_dates": payload.blocked_dates}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Listing not found")
    return {"ok": True, "blocked_dates": payload.blocked_dates}


# ---------- Push notifications ----------
@api_router.post("/push/register")
async def register_push_token(payload: PushRegister, current_user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"id": current_user["id"]}, {"$set": {"push_token": payload.token}}
    )
    return {"ok": True}


@api_router.get("/notifications")
async def list_notifications(current_user: dict = Depends(get_current_user)):
    items = await db.notifications.find(
        {"user_id": current_user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return items


@api_router.post("/notifications/{notif_id}/read")
async def mark_notif_read(notif_id: str, current_user: dict = Depends(get_current_user)):
    await db.notifications.update_one(
        {"id": notif_id, "user_id": current_user["id"]}, {"$set": {"read": True}}
    )
    return {"ok": True}


@api_router.post("/notifications/read-all")
async def mark_all_notifs_read(current_user: dict = Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": current_user["id"], "read": False}, {"$set": {"read": True}}
    )
    return {"ok": True}


# ---------- Parrainage ----------
@api_router.get("/referral/me")
async def my_referral(current_user: dict = Depends(get_current_user)):
    me = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "password_hash": 0})
    referrals = await db.users.find(
        {"referred_by": me.get("referral_code")}, {"_id": 0, "password_hash": 0}
    ).to_list(200)
    results = []
    for r in referrals:
        has_booked = await db.bookings.count_documents(
            {"renter_id": r["id"], "status": "paid"}
        ) > 0
        results.append({
            "id": r["id"], "name": r["name"], "joined_at": r["created_at"],
            "has_booked": has_booked,
        })
    return {
        "referral_code": me.get("referral_code"),
        "credit_balance": me.get("credit_balance", 0),
        "referrals": results,
        "reward_amount": 10,
    }


@api_router.post("/referral/check")
async def check_referral(payload: ReferralCheck):
    sponsor = await db.users.find_one(
        {"referral_code": payload.code.upper()}, {"_id": 0, "password_hash": 0}
    )
    if not sponsor:
        return {"valid": False, "message": "Code invalide"}
    return {"valid": True, "sponsor_name": sponsor["name"], "reward": 10}


@api_router.get("/reviews/pending")
async def pending_reviews(current_user: dict = Depends(get_current_user)):
    me = current_user["id"]
    paid_bookings = await db.bookings.find(
        {"renter_id": me, "status": "paid"}, {"_id": 0}
    ).to_list(200)
    reviewed_listings = set(
        r["listing_id"] async for r in db.reviews.find({"author_id": me}, {"listing_id": 1})
    )
    pending = []
    for b in paid_bookings:
        if b["listing_id"] in reviewed_listings:
            continue
        listing = await db.listings.find_one({"id": b["listing_id"]}, {"_id": 0})
        pending.append({"booking": b, "listing": listing})
    return pending


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

    try:
        status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
        if status:
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
    except Exception as e:
        logger.warning(f"Stripe status fetch failed, using local fallback: {e}")

    # Fallback to local transaction record
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "status": tx.get("status", "open"),
        "payment_status": tx.get("payment_status", "unpaid"),
        "amount_total": int(round(float(tx.get("amount", 0)) * 100)),
        "currency": tx.get("currency", "eur"),
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
