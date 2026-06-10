from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import smtplib
import bcrypt
import jwt
import re
import secrets
from datetime import date, datetime, timezone, timedelta
from email.message import EmailMessage
from typing import List, Optional, Tuple

import requests
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# ---------- MongoDB ----------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
REQUIRE_KYC = os.environ.get("LOCASHARE_REQUIRE_KYC", "true").lower() != "false"
AUTO_VERIFY_KYC = os.environ.get("LOCASHARE_AUTO_VERIFY_KYC", "true").lower() != "false"
ENABLE_LOCAL_PAYMENTS = os.environ.get("LOCASHARE_ENABLE_LOCAL_PAYMENTS", "true").lower() != "false"
RETURN_DEV_OTP = os.environ.get("LOCASHARE_RETURN_DEV_OTP", "true").lower() != "false"

BOOKING_STATUSES = {
    "pending",
    "confirmed",
    "refused",
    "cancelled",
    "paid",
    "active",
    "returned",
    "completed",
    "disputed",
}
ACTIVE_BOOKING_STATUSES = {"confirmed", "paid", "active"}

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
    phone: Optional[str] = None
    referral_code: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    phone: Optional[str] = None
    avatar: Optional[str] = None
    verified: bool = False
    kyc_status: str = "none"
    kyc_source: Optional[str] = None
    referral_code: Optional[str] = None
    credit_balance: float = 0
    referred_by: Optional[str] = None
    contact_verified_at: Optional[datetime] = None
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
    service_fee: float = 0.0
    status: str = "pending"  # pending, paid, cancelled
    payment_method: str = "cash"
    payment_status: str = "cash_to_collect"
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
    status: Optional[str] = None


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


class OTPRequest(BaseModel):
    email: EmailStr
    phone: str
    name: Optional[str] = None


class OTPVerify(BaseModel):
    email: EmailStr
    phone: str
    code: str
    name: Optional[str] = None


class PaymentMethodCreate(BaseModel):
    brand: str = "card"
    last4: str
    exp_month: int
    exp_year: int
    holder_name: Optional[str] = None
    is_default: bool = True


class SupportTicketCreate(BaseModel):
    subject: str
    message: str
    category: str = "general"
    booking_id: Optional[str] = None
    email: Optional[EmailStr] = None
    name: Optional[str] = None


class SupportMessageCreate(BaseModel):
    message: str


class InspectionCreate(BaseModel):
    kind: str  # pickup, return
    condition: str = "ok"  # ok, issue, damaged
    notes: Optional[str] = ""
    photos: List[str] = []


class DisputeCreate(BaseModel):
    booking_id: str
    reason: str
    description: str
    photos: List[str] = []


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


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[dict]:
    if not credentials:
        return None
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


def serialize_user(user: dict) -> dict:
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "phone": user.get("phone"),
        "avatar": user.get("avatar"),
        "verified": user.get("verified", False),
        "kyc_status": user.get("kyc_status", "none"),
        "kyc_source": user.get("kyc_source"),
        "referral_code": user.get("referral_code"),
        "credit_balance": user.get("credit_balance", 0),
        "referred_by": user.get("referred_by"),
        "contact_verified_at": user.get("contact_verified_at"),
        "created_at": user["created_at"],
    }


def public_user(user: dict) -> dict:
    return {
        "id": user["id"],
        "name": user["name"],
        "avatar": user.get("avatar"),
        "verified": user.get("verified", False),
        "kyc_status": user.get("kyc_status", "none"),
        "kyc_source": user.get("kyc_source"),
    }


def gen_referral_code(name: str) -> str:
    base = "".join(c for c in name.upper() if c.isalpha())[:6] or "USER"
    return base + uuid.uuid4().hex[:3].upper()


async def notify_user(
    user_id: str,
    type_: str,
    title: str,
    body: str,
    data: Optional[dict] = None,
) -> dict:
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": type_,
        "title": title,
        "body": body,
        "data": data or {},
        "read": False,
        "created_at": datetime.now(timezone.utc),
    }
    await db.notifications.insert_one(notification)
    return notification


def kyc_required_error(reason: str) -> HTTPException:
    return HTTPException(
        status_code=403,
        detail={
            "detail": "Vérification email et téléphone requise pour continuer.",
            "code": "KYC_REQUIRED",
            "action": f"/auth/otp?reason={reason}",
        },
    )


def ensure_marketplace_verified(user: dict, reason: str) -> None:
    if REQUIRE_KYC and not user.get("verified", False):
        raise kyc_required_error(reason)


def parse_iso_date(value: str, field_name: str) -> date:
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).date()
    except Exception:
        raise HTTPException(status_code=400, detail=f"{field_name} must be an ISO date")


def date_range(start: date, end: date) -> List[str]:
    days = (end - start).days
    return [(start + timedelta(days=i)).isoformat() for i in range(days + 1)]


def overlaps(start: date, end: date, other_start: str, other_end: str) -> bool:
    existing_start = parse_iso_date(other_start, "booking.start_date")
    existing_end = parse_iso_date(other_end, "booking.end_date")
    return start <= existing_end and end >= existing_start


async def find_availability_conflict(
    listing: dict,
    start: date,
    end: date,
    exclude_booking_id: Optional[str] = None,
) -> Optional[Tuple[str, List[str]]]:
    requested_dates = set(date_range(start, end))
    blocked = set(listing.get("blocked_dates", []))
    blocked_overlap = sorted(requested_dates.intersection(blocked))
    if blocked_overlap:
        return "blocked_dates", blocked_overlap

    query = {
        "listing_id": listing["id"],
        "status": {"$in": list(ACTIVE_BOOKING_STATUSES)},
    }
    if exclude_booking_id:
        query["id"] = {"$ne": exclude_booking_id}

    active_bookings = await db.bookings.find(query, {"_id": 0}).to_list(200)
    conflicting = [
        booking["id"]
        for booking in active_bookings
        if overlaps(start, end, booking["start_date"], booking["end_date"])
    ]
    if conflicting:
        return "bookings", conflicting
    return None


def stripe_is_configured() -> bool:
    api_key = os.environ.get("STRIPE_API_KEY", "")
    return api_key.startswith("sk_") and "CHANGE_ME" not in api_key


def normalize_phone(phone: str) -> str:
    value = (phone or "").strip()
    value = value.replace("(0)", "")
    if value.startswith("00"):
        value = "+" + value[2:]
    digits = re.sub(r"\D", "", value)
    if value.startswith("+"):
        normalized = "+" + digits
    elif digits.startswith("0") and len(digits) == 10:
        normalized = "+33" + digits[1:]
    elif digits.startswith("33") and len(digits) == 11:
        normalized = "+" + digits
    else:
        normalized = "+" + digits if len(digits) >= 8 else digits
    if not re.fullmatch(r"\+\d{8,15}", normalized):
        raise HTTPException(status_code=400, detail="Numéro de téléphone invalide")
    return normalized


def generate_otp_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def send_otp_email(email: str, code: str) -> bool:
    smtp_host = os.environ.get("SMTP_HOST")
    smtp_from = os.environ.get("SMTP_FROM") or os.environ.get("SMTP_USERNAME")
    if not smtp_host or not smtp_from:
        return False

    smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    smtp_user = os.environ.get("SMTP_USERNAME")
    smtp_password = os.environ.get("SMTP_PASSWORD")
    use_ssl = os.environ.get("SMTP_USE_SSL", "false").lower() == "true"
    use_tls = os.environ.get("SMTP_USE_TLS", "true").lower() != "false"

    msg = EmailMessage()
    msg["Subject"] = "Votre code LocaShare"
    msg["From"] = smtp_from
    msg["To"] = email
    msg.set_content(
        "Votre code de connexion LocaShare est "
        f"{code}. Il expire dans 10 minutes."
    )

    if use_ssl:
        server_ctx = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=8)
    else:
        server_ctx = smtplib.SMTP(smtp_host, smtp_port, timeout=8)

    with server_ctx as server:
        if use_tls and not use_ssl:
            server.starttls()
        if smtp_user and smtp_password:
            server.login(smtp_user, smtp_password)
        server.send_message(msg)
    return True


def send_otp_sms(phone: str, code: str) -> bool:
    account_sid = os.environ.get("TWILIO_ACCOUNT_SID")
    auth_token = os.environ.get("TWILIO_AUTH_TOKEN")
    from_phone = os.environ.get("TWILIO_FROM_PHONE")
    messaging_service_sid = os.environ.get("TWILIO_MESSAGING_SERVICE_SID")
    if not account_sid or not auth_token or not (from_phone or messaging_service_sid):
        return False

    payload = {
        "To": phone,
        "Body": f"LocaShare: votre code de connexion est {code}. Il expire dans 10 minutes.",
    }
    if messaging_service_sid:
        payload["MessagingServiceSid"] = messaging_service_sid
    else:
        payload["From"] = from_phone

    res = requests.post(
        f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json",
        data=payload,
        auth=(account_sid, auth_token),
        timeout=8,
    )
    if res.status_code >= 400:
        raise RuntimeError(f"Twilio SMS failed: {res.status_code} {res.text[:200]}")
    return True


def deliver_otp_code(email: str, phone: str, code: str) -> dict:
    delivery = {"email_sent": False, "sms_sent": False, "dev_mode": RETURN_DEV_OTP}
    errors = []
    try:
        delivery["email_sent"] = send_otp_email(email, code)
    except Exception as exc:
        errors.append(f"email: {exc}")
    try:
        delivery["sms_sent"] = send_otp_sms(phone, code)
    except Exception as exc:
        errors.append(f"sms: {exc}")

    if errors:
        logger.warning("OTP delivery partial failure for %s / %s: %s", email, phone, "; ".join(errors))
    if not RETURN_DEV_OTP and (not delivery["email_sent"] or not delivery["sms_sent"]):
        raise HTTPException(
            status_code=503,
            detail="Envoi du code indisponible. Configurez SMTP et Twilio pour livrer email + SMS.",
        )
    return delivery


# ---------- Auth Endpoints ----------
@api_router.post("/auth/otp/request")
async def request_otp(payload: OTPRequest):
    email = payload.email.lower().strip()
    phone = normalize_phone(payload.phone)
    code = generate_otp_code()
    now = datetime.now(timezone.utc)

    await db.otp_codes.delete_many({"$or": [{"email": email}, {"phone": phone}]})
    await db.otp_codes.insert_one({
        "id": str(uuid.uuid4()),
        "email": email,
        "phone": phone,
        "code_hash": hash_password(code),
        "attempts": 0,
        "expires_at": now + timedelta(minutes=10),
        "created_at": now,
    })

    try:
        delivery = deliver_otp_code(email, phone, code)
    except HTTPException:
        await db.otp_codes.delete_many({"email": email, "phone": phone})
        raise

    if RETURN_DEV_OTP:
        logger.info("OTP requested for %s / %s. Dev code: %s", email, phone, code)
    else:
        logger.info("OTP requested for %s / %s", email, phone)
    response = {
        "ok": True,
        "message": "Code envoyé par email et SMS.",
        "expires_in": 600,
        "delivery": {"email": email, "phone": phone, **delivery},
    }
    if RETURN_DEV_OTP:
        response["_dev_code"] = code
    return response


@api_router.post("/auth/otp/verify", response_model=AuthResponse)
async def verify_otp(payload: OTPVerify):
    email = payload.email.lower().strip()
    phone = normalize_phone(payload.phone)
    code = re.sub(r"\D", "", payload.code or "")
    if len(code) != 6:
        raise HTTPException(status_code=400, detail="Code invalide")

    otp = await db.otp_codes.find_one({"email": email, "phone": phone})
    if not otp:
        raise HTTPException(status_code=400, detail="Aucun code actif pour ces coordonnées")
    expires_at = otp["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > expires_at:
        await db.otp_codes.delete_one({"id": otp["id"]})
        raise HTTPException(status_code=400, detail="Code expiré")
    if otp.get("attempts", 0) >= 5:
        await db.otp_codes.delete_one({"id": otp["id"]})
        raise HTTPException(status_code=429, detail="Trop de tentatives")
    if not verify_password(code, otp["code_hash"]):
        await db.otp_codes.update_one({"id": otp["id"]}, {"$inc": {"attempts": 1}})
        raise HTTPException(status_code=401, detail="Code incorrect")

    user = await db.users.find_one({"$or": [{"email": email}, {"phone": phone}]})
    now = datetime.now(timezone.utc)
    if not user:
        name = (payload.name or email.split("@")[0]).strip() or "Utilisateur"
        user = {
            "id": str(uuid.uuid4()),
            "email": email,
            "phone": phone,
            "name": name,
            "password_hash": hash_password(secrets.token_urlsafe(24)),
            "avatar": None,
            "verified": True,
            "kyc_status": "verified",
            "kyc_source": "email_phone_otp",
            "contact_verified_at": now,
            "referral_code": gen_referral_code(name),
            "credit_balance": 0,
            "referred_by": None,
            "created_at": now,
        }
        await db.users.insert_one(user)
    else:
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {
                "email": email,
                "phone": phone,
                "verified": True,
                "kyc_status": "verified",
                "kyc_source": "email_phone_otp",
                "contact_verified_at": now,
            }},
        )
        user = await db.users.find_one({"id": user["id"]})

    await db.otp_codes.delete_one({"id": otp["id"]})
    token = create_access_token(user["id"], email)
    return {"user": serialize_user(user), "access_token": token}


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
        "phone": normalize_phone(payload.phone) if payload.phone else None,
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
        await notify_user(
            sponsor["id"],
            "referral_credit",
            "Nouveau filleul",
            f"{payload.name} s'est inscrit avec votre code. +10€ crédités.",
            {"referred_user_id": user_doc["id"]},
        )

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
    ensure_marketplace_verified(current_user, "publish")
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
    ensure_marketplace_verified(current_user, "booking")
    listing = await db.listings.find_one({"id": payload.listing_id}, {"_id": 0})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing["owner_id"] == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot book your own listing")

    start = parse_iso_date(payload.start_date, "start_date")
    end = parse_iso_date(payload.end_date, "end_date")
    today = datetime.now(timezone.utc).date()
    if start < today:
        raise HTTPException(status_code=400, detail="Start date cannot be in the past")
    if end < start:
        raise HTTPException(status_code=400, detail="End date must be after start date")
    conflict = await find_availability_conflict(listing, start, end)
    if conflict:
        conflict_type, refs = conflict
        raise HTTPException(
            status_code=409,
            detail={
                "detail": "Ces dates ne sont plus disponibles.",
                "code": "DATES_UNAVAILABLE",
                "type": conflict_type,
                "refs": refs,
            },
        )

    days = max(1, (end - start).days + 1)
    subtotal = days * float(listing["price_per_day"])
    service_fee = 0
    total = round(subtotal, 2)

    booking = Booking(
        listing_id=payload.listing_id,
        renter_id=current_user["id"],
        owner_id=listing["owner_id"],
        start_date=payload.start_date,
        end_date=payload.end_date,
        days=days,
        total_price=total,
        payment_method="cash",
        payment_status="cash_to_collect",
    )
    await db.bookings.insert_one(booking.dict())
    await notify_user(
        listing["owner_id"],
        "booking_request",
        "Nouvelle demande de réservation",
        f"{current_user['name']} souhaite louer {listing['title']}.",
        {"booking_id": booking.id, "listing_id": listing["id"]},
    )
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
    if new_status not in BOOKING_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")
    if new_status in {"confirmed", "refused"} and booking["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only owner can confirm/refuse")
    if new_status == "cancelled" and booking["renter_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only renter can cancel")
    if new_status in {"paid", "active", "returned", "completed", "disputed"}:
        if current_user["id"] not in {booking["owner_id"], booking["renter_id"]}:
            raise HTTPException(status_code=403, detail="Only booking participants can update this status")
    if new_status in ACTIVE_BOOKING_STATUSES:
        listing = await db.listings.find_one({"id": booking["listing_id"]}, {"_id": 0})
        if listing:
            start = parse_iso_date(booking["start_date"], "start_date")
            end = parse_iso_date(booking["end_date"], "end_date")
            conflict = await find_availability_conflict(listing, start, end, exclude_booking_id=booking_id)
            if conflict:
                conflict_type, refs = conflict
                raise HTTPException(
                    status_code=409,
                    detail={
                        "detail": "Cette réservation chevauche déjà une période indisponible.",
                        "code": "DATES_UNAVAILABLE",
                        "type": conflict_type,
                        "refs": refs,
                    },
                )
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc)}},
    )
    recipient = booking["renter_id"] if current_user["id"] == booking["owner_id"] else booking["owner_id"]
    await notify_user(
        recipient,
        "booking_status",
        "Réservation mise à jour",
        f"Le statut de la réservation est maintenant {new_status}.",
        {"booking_id": booking_id, "status": new_status},
    )
    return await db.bookings.find_one({"id": booking_id}, {"_id": 0})


# ---------- Messages ----------
@api_router.post("/messages")
async def send_message(
    payload: MessageCreate, current_user: dict = Depends(get_current_user)
):
    if payload.to_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot message yourself")
    # Vérification email+téléphone obligatoire
    if not current_user.get("verified", False):
        raise HTTPException(
            status_code=403,
            detail={
                "detail": "Vérification email et téléphone requise pour contacter un propriétaire.",
                "code": "KYC_REQUIRED",
                "action": "/auth/otp?reason=message",
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
        "status": {"$in": ["paid", "returned", "completed"]},
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
    status = "verified" if AUTO_VERIFY_KYC else "pending"
    verified = AUTO_VERIFY_KYC
    await db.kyc_documents.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "document_type": payload.document_type,
        "document_size": len(payload.document_image),
        "document_preview": payload.document_image[:32],
        "storage_note": "Document image omitted from MongoDB; store encrypted object storage URL in production.",
        "status": status,
        "created_at": datetime.now(timezone.utc),
    })
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"kyc_status": status, "verified": verified, "kyc_source": "local_auto" if verified else "manual_review"}},
    )
    if verified:
        await notify_user(
            current_user["id"],
            "kyc_verified",
            "Coordonnées vérifiées",
            "Votre email et votre téléphone sont maintenant vérifiés.",
        )
        return {"status": "verified", "verified": True, "message": "Coordonnées vérifiées"}
    return {"status": "pending", "verified": False, "message": "Document soumis, vérification sous 24h"}


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
        {"listing_id": listing_id, "status": {"$in": list(ACTIVE_BOOKING_STATUSES)}}, {"_id": 0}
    ).to_list(200)
    booked = []
    for b in bookings:
        try:
            start = parse_iso_date(b["start_date"], "start_date")
            end = parse_iso_date(b["end_date"], "end_date")
            booked.extend(date_range(start, end))
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
        {"renter_id": me, "status": {"$in": ["paid", "returned", "completed"]}}, {"_id": 0}
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


# ---------- Payment methods ----------
@api_router.get("/payment-methods")
async def list_payment_methods(current_user: dict = Depends(get_current_user)):
    raise HTTPException(
        status_code=410,
        detail="Les paiements en ligne sont désactivés. Le règlement se fait en espèces entre utilisateurs.",
    )
    return await db.payment_methods.find(
        {"user_id": current_user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)


@api_router.post("/payment-methods")
async def create_payment_method(
    payload: PaymentMethodCreate,
    current_user: dict = Depends(get_current_user),
):
    raise HTTPException(
        status_code=410,
        detail="Les cartes ne sont pas acceptées pour le moment. Le règlement se fait en espèces.",
    )
    last4 = "".join(c for c in payload.last4 if c.isdigit())
    if len(last4) != 4:
        raise HTTPException(status_code=400, detail="last4 must contain 4 digits")
    if payload.exp_month < 1 or payload.exp_month > 12:
        raise HTTPException(status_code=400, detail="Invalid expiry month")
    if payload.exp_year < datetime.now(timezone.utc).year:
        raise HTTPException(status_code=400, detail="Invalid expiry year")

    existing_count = await db.payment_methods.count_documents({"user_id": current_user["id"]})
    is_default = payload.is_default or existing_count == 0
    if is_default:
        await db.payment_methods.update_many(
            {"user_id": current_user["id"]}, {"$set": {"is_default": False}}
        )

    method = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "brand": payload.brand.lower().strip()[:24] or "card",
        "last4": last4,
        "exp_month": payload.exp_month,
        "exp_year": payload.exp_year,
        "holder_name": payload.holder_name,
        "is_default": is_default,
        "provider": "local_vault",
        "created_at": datetime.now(timezone.utc),
    }
    await db.payment_methods.insert_one(method)
    return {**method, "_id": None}


@api_router.patch("/payment-methods/{method_id}/default")
async def set_default_payment_method(
    method_id: str,
    current_user: dict = Depends(get_current_user),
):
    raise HTTPException(
        status_code=410,
        detail="Les cartes ne sont pas acceptées pour le moment. Le règlement se fait en espèces.",
    )
    method = await db.payment_methods.find_one({"id": method_id, "user_id": current_user["id"]}, {"_id": 0})
    if not method:
        raise HTTPException(status_code=404, detail="Payment method not found")
    await db.payment_methods.update_many(
        {"user_id": current_user["id"]}, {"$set": {"is_default": False}}
    )
    await db.payment_methods.update_one(
        {"id": method_id, "user_id": current_user["id"]}, {"$set": {"is_default": True}}
    )
    return await db.payment_methods.find_one({"id": method_id}, {"_id": 0})


@api_router.delete("/payment-methods/{method_id}")
async def delete_payment_method(
    method_id: str,
    current_user: dict = Depends(get_current_user),
):
    raise HTTPException(
        status_code=410,
        detail="Les cartes ne sont pas acceptées pour le moment. Le règlement se fait en espèces.",
    )
    method = await db.payment_methods.find_one({"id": method_id, "user_id": current_user["id"]}, {"_id": 0})
    if not method:
        raise HTTPException(status_code=404, detail="Payment method not found")
    await db.payment_methods.delete_one({"id": method_id, "user_id": current_user["id"]})
    if method.get("is_default"):
        next_method = await db.payment_methods.find_one(
            {"user_id": current_user["id"]}, sort=[("created_at", -1)]
        )
        if next_method:
            await db.payment_methods.update_one({"id": next_method["id"]}, {"$set": {"is_default": True}})
    return {"ok": True}


# ---------- Support ----------
@api_router.post("/support/tickets")
async def create_support_ticket(
    payload: SupportTicketCreate,
    current_user: Optional[dict] = Depends(get_optional_user),
):
    subject = payload.subject.strip()
    message = payload.message.strip()
    if not subject or not message:
        raise HTTPException(status_code=400, detail="Subject and message are required")
    if not current_user and not payload.email:
        raise HTTPException(status_code=401, detail="Connectez-vous ou fournissez un email")

    ticket = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"] if current_user else None,
        "email": current_user["email"] if current_user else str(payload.email),
        "name": current_user["name"] if current_user else (payload.name or ""),
        "subject": subject,
        "category": payload.category.strip()[:40] or "general",
        "booking_id": payload.booking_id,
        "status": "open",
        "priority": "normal",
        "messages": [
            {
                "id": str(uuid.uuid4()),
                "from": "user",
                "message": message,
                "created_at": datetime.now(timezone.utc),
            }
        ],
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    await db.support_tickets.insert_one(ticket)
    if current_user:
        await notify_user(
            current_user["id"],
            "support_ticket",
            "Demande support reçue",
            f"Ticket {ticket['id'][:8]} ouvert: {subject}",
            {"ticket_id": ticket["id"]},
        )
    return {**ticket, "_id": None, "email_queued": False}


@api_router.get("/support/tickets/me")
async def my_support_tickets(current_user: dict = Depends(get_current_user)):
    return await db.support_tickets.find(
        {"user_id": current_user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)


@api_router.post("/support/tickets/{ticket_id}/messages")
async def add_support_message(
    ticket_id: str,
    payload: SupportMessageCreate,
    current_user: dict = Depends(get_current_user),
):
    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")
    ticket = await db.support_tickets.find_one({"id": ticket_id, "user_id": current_user["id"]}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Support ticket not found")
    item = {
        "id": str(uuid.uuid4()),
        "from": "user",
        "message": message,
        "created_at": datetime.now(timezone.utc),
    }
    await db.support_tickets.update_one(
        {"id": ticket_id},
        {"$push": {"messages": item}, "$set": {"updated_at": datetime.now(timezone.utc)}},
    )
    return item


# ---------- Rental handover / disputes ----------
def require_booking_participant(booking: dict, user: dict) -> None:
    if user["id"] not in {booking["renter_id"], booking["owner_id"]}:
        raise HTTPException(status_code=403, detail="Only booking participants can access this resource")


@api_router.post("/bookings/{booking_id}/inspection")
async def create_booking_inspection(
    booking_id: str,
    payload: InspectionCreate,
    current_user: dict = Depends(get_current_user),
):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    require_booking_participant(booking, current_user)
    if payload.kind not in {"pickup", "return"}:
        raise HTTPException(status_code=400, detail="kind must be pickup or return")
    if payload.condition not in {"ok", "issue", "damaged"}:
        raise HTTPException(status_code=400, detail="Invalid condition")

    if payload.kind == "pickup" and booking["status"] not in {"confirmed", "paid"}:
        raise HTTPException(status_code=400, detail="Pickup can only start after confirmation or payment")
    if payload.kind == "return" and booking["status"] != "active":
        raise HTTPException(status_code=400, detail="Return can only be confirmed while booking is active")

    new_status = "active" if payload.kind == "pickup" else "completed"
    if payload.condition in {"issue", "damaged"}:
        new_status = "disputed"

    inspection = {
        "id": str(uuid.uuid4()),
        "booking_id": booking_id,
        "user_id": current_user["id"],
        "kind": payload.kind,
        "condition": payload.condition,
        "notes": payload.notes or "",
        "photos": payload.photos,
        "created_at": datetime.now(timezone.utc),
    }
    await db.booking_inspections.insert_one(inspection)
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc)}},
    )
    other_user_id = booking["owner_id"] if current_user["id"] == booking["renter_id"] else booking["renter_id"]
    await notify_user(
        other_user_id,
        "booking_inspection",
        "État des lieux ajouté",
        f"Un état des lieux {payload.kind} a été ajouté.",
        {"booking_id": booking_id, "inspection_id": inspection["id"], "status": new_status},
    )
    return {**inspection, "_id": None, "booking_status": new_status}


@api_router.get("/bookings/{booking_id}/inspections")
async def list_booking_inspections(
    booking_id: str,
    current_user: dict = Depends(get_current_user),
):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    require_booking_participant(booking, current_user)
    return await db.booking_inspections.find(
        {"booking_id": booking_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(50)


@api_router.post("/disputes")
async def create_dispute(payload: DisputeCreate, current_user: dict = Depends(get_current_user)):
    booking = await db.bookings.find_one({"id": payload.booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    require_booking_participant(booking, current_user)
    if not payload.reason.strip() or not payload.description.strip():
        raise HTTPException(status_code=400, detail="Reason and description are required")
    dispute = {
        "id": str(uuid.uuid4()),
        "booking_id": payload.booking_id,
        "listing_id": booking["listing_id"],
        "opened_by": current_user["id"],
        "owner_id": booking["owner_id"],
        "renter_id": booking["renter_id"],
        "reason": payload.reason.strip()[:80],
        "description": payload.description.strip(),
        "photos": payload.photos,
        "status": "open",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    await db.disputes.insert_one(dispute)
    await db.bookings.update_one(
        {"id": payload.booking_id},
        {"$set": {"status": "disputed", "updated_at": datetime.now(timezone.utc)}},
    )
    other_user_id = booking["owner_id"] if current_user["id"] == booking["renter_id"] else booking["renter_id"]
    await notify_user(
        other_user_id,
        "dispute_opened",
        "Litige ouvert",
        "Un litige a été ouvert sur une réservation.",
        {"booking_id": payload.booking_id, "dispute_id": dispute["id"]},
    )
    return {**dispute, "_id": None}


@api_router.get("/disputes/me")
async def my_disputes(current_user: dict = Depends(get_current_user)):
    return await db.disputes.find(
        {"$or": [{"owner_id": current_user["id"]}, {"renter_id": current_user["id"]}]},
        {"_id": 0},
    ).sort("created_at", -1).to_list(100)


async def mark_booking_paid(
    booking: dict,
    session_id: str,
    user_id: str,
    amount: float,
    provider: str,
) -> None:
    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {
            "$set": {
                "session_id": session_id,
                "booking_id": booking["id"],
                "user_id": user_id,
                "amount": amount,
                "currency": "eur",
                "status": "complete",
                "payment_status": "paid",
                "provider": provider,
                "metadata": {"booking_id": booking["id"]},
                "updated_at": datetime.now(timezone.utc),
            },
            "$setOnInsert": {"created_at": datetime.now(timezone.utc)},
        },
        upsert=True,
    )
    await db.bookings.update_one(
        {"id": booking["id"]},
        {"$set": {"status": "paid", "payment_session_id": session_id, "updated_at": datetime.now(timezone.utc)}},
    )
    await notify_user(
        booking["owner_id"],
        "booking_paid",
        "Réservation payée",
        "Le paiement de la réservation a été confirmé.",
        {"booking_id": booking["id"], "session_id": session_id},
    )


# ---------- Stripe Checkout ----------
@api_router.post("/checkout/session")
async def create_checkout(
    payload: CheckoutRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    raise HTTPException(
        status_code=410,
        detail="Le checkout en ligne est désactivé. Cette réservation se règle en espèces à la remise.",
    )


@api_router.get("/checkout/status/{session_id}")
async def checkout_status(session_id: str, request: Request):
    raise HTTPException(
        status_code=410,
        detail="Le checkout en ligne est désactivé. Les réservations se règlent en espèces à la remise.",
    )


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
    await db.users.create_index("phone", unique=True, sparse=True)
    await db.users.create_index("id", unique=True)
    await db.otp_codes.create_index([("email", 1), ("phone", 1)])
    await db.otp_codes.create_index("expires_at", expireAfterSeconds=0)
    await db.listings.create_index("id", unique=True)
    await db.bookings.create_index("id", unique=True)
    await db.bookings.create_index([("listing_id", 1), ("status", 1)])
    await db.payment_transactions.create_index("session_id", unique=True)
    await db.payment_methods.create_index([("user_id", 1), ("created_at", -1)])
    await db.support_tickets.create_index([("user_id", 1), ("created_at", -1)])
    await db.booking_inspections.create_index([("booking_id", 1), ("created_at", 1)])
    await db.disputes.create_index([("owner_id", 1), ("renter_id", 1), ("created_at", -1)])
    await db.notifications.create_index([("user_id", 1), ("created_at", -1)])

    # seed demo user
    demo_email = "demo@locashare.fr"
    demo_user = await db.users.find_one({"email": demo_email})
    if not demo_user:
        demo_user = {
            "id": str(uuid.uuid4()),
            "email": demo_email,
            "phone": "+33600000000",
            "name": "Sophie Martin",
            "password_hash": hash_password("demo1234"),
            "avatar": None,
            "verified": True,
            "kyc_status": "verified",
            "kyc_source": "email_phone_otp",
            "contact_verified_at": datetime.now(timezone.utc),
            "referral_code": "SOPHIE" + uuid.uuid4().hex[:3].upper(),
            "credit_balance": 0,
            "referred_by": None,
            "created_at": datetime.now(timezone.utc),
        }
        await db.users.insert_one(demo_user)
    else:
        await db.users.update_one(
            {"id": demo_user["id"]},
            {
                "$set": {
                    "verified": demo_user.get("verified", True),
                    "kyc_status": demo_user.get("kyc_status", "verified"),
                    "kyc_source": demo_user.get("kyc_source", "email_phone_otp"),
                    "phone": demo_user.get("phone") or "+33600000000",
                    "contact_verified_at": demo_user.get("contact_verified_at") or datetime.now(timezone.utc),
                    "referral_code": demo_user.get("referral_code") or ("SOPHIE" + uuid.uuid4().hex[:3].upper()),
                    "credit_balance": demo_user.get("credit_balance", 0),
                    "referred_by": demo_user.get("referred_by"),
                },
            },
        )
        demo_user = await db.users.find_one({"email": demo_email})

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
