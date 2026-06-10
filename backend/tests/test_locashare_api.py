"""LocaShare backend API tests - full coverage."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://mobility-platform-118.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

DEMO_EMAIL = "demo@locashare.fr"
DEMO_PHONE = "+33600000000"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def demo_token(session):
    return otp_login(session, DEMO_EMAIL, DEMO_PHONE)["token"]


@pytest.fixture(scope="module")
def new_user(session):
    """A fresh user who can book demo listings (cannot book own listings)."""
    email = f"TEST_{uuid.uuid4().hex[:8]}@example.com"
    suffix = int(uuid.uuid4().hex[:8], 16) % 100000000
    phone = f"+336{suffix:08d}"
    return otp_login(session, email, phone, name="Test User")


def otp_login(session, email, phone, name="Test User"):
    r = session.post(f"{API}/auth/otp/request", json={"email": email, "phone": phone, "name": name})
    assert r.status_code == 200, r.text
    code = r.json().get("_dev_code")
    assert code, "OTP tests require LOCASHARE_RETURN_DEV_OTP=true"
    v = session.post(f"{API}/auth/otp/verify", json={"email": email, "phone": phone, "code": code, "name": name})
    assert v.status_code == 200, v.text
    data = v.json()
    assert data["user"]["verified"] is True
    return {"email": email, "phone": phone, "token": data["access_token"], "id": data["user"]["id"]}


# ----------- Health / Categories / Listings read -----------
class TestPublicEndpoints:
    def test_health(self, session):
        r = session.get(f"{API}/")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    def test_categories_returns_7(self, session):
        r = session.get(f"{API}/categories")
        assert r.status_code == 200
        cats = r.json()
        assert len(cats) == 7
        ids = {c["id"] for c in cats}
        assert {"all", "car", "bike", "tool", "tech", "camping", "other"} == ids

    def test_listings_seeded(self, session):
        r = session.get(f"{API}/listings")
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 8
        cats = {i["category"] for i in items}
        assert {"car", "bike", "tool", "tech", "camping"}.issubset(cats)
        # owner info attached
        assert items[0]["owner"] is not None
        assert "name" in items[0]["owner"]

    def test_listings_filter_by_category(self, session):
        r = session.get(f"{API}/listings", params={"category": "car"})
        assert r.status_code == 200
        items = r.json()
        assert all(i["category"] == "car" for i in items)

    def test_listing_by_id(self, session):
        listings = session.get(f"{API}/listings").json()
        lid = listings[0]["id"]
        r = session.get(f"{API}/listings/{lid}")
        assert r.status_code == 200
        data = r.json()
        assert data["id"] == lid
        assert data["owner"] is not None
        assert "created_at" in data["owner"]

    def test_listing_not_found(self, session):
        r = session.get(f"{API}/listings/does-not-exist")
        assert r.status_code == 404


# ----------- Auth -----------
class TestAuth:
    def test_otp_login_creates_verified_user(self, session):
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        phone = f"+336{int(uuid.uuid4().hex[:8], 16) % 100000000:08d}"
        r = session.post(f"{API}/auth/otp/request", json={"email": email, "phone": phone, "name": "Reg User"})
        assert r.status_code == 200
        code = r.json().get("_dev_code")
        assert code, "OTP tests require LOCASHARE_RETURN_DEV_OTP=true"
        v = session.post(f"{API}/auth/otp/verify", json={"email": email, "phone": phone, "code": code, "name": "Reg User"})
        assert v.status_code == 200, v.text
        d = v.json()
        assert d["access_token"]
        assert d["user"]["email"] == email.lower()
        assert d["user"]["phone"].startswith("+33")
        assert d["user"]["verified"] is True

    def test_login_demo(self, session, demo_token):
        assert demo_token

    def test_otp_invalid_code(self, session):
        email = f"bad_{uuid.uuid4().hex[:8]}@example.com"
        phone = f"+336{int(uuid.uuid4().hex[:8], 16) % 100000000:08d}"
        r = session.post(f"{API}/auth/otp/request", json={"email": email, "phone": phone, "name": "Bad Code"})
        assert r.status_code == 200
        v = session.post(f"{API}/auth/otp/verify", json={"email": email, "phone": phone, "code": "000000", "name": "Bad Code"})
        assert v.status_code == 400

    def test_me_requires_token(self, session):
        r = session.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_with_token(self, session, demo_token):
        r = session.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {demo_token}"})
        assert r.status_code == 200
        assert r.json()["email"] == DEMO_EMAIL


# ----------- Listings authenticated -----------
class TestListingsAuth:
    def test_create_and_delete_listing(self, session, new_user):
        h = {"Authorization": f"Bearer {new_user['token']}"}
        payload = {
            "title": "TEST_Listing",
            "description": "Test listing",
            "category": "tool",
            "price_per_day": 10.0,
            "photos": [],
            "location": {"lat": 48.85, "lng": 2.35, "address": "Paris"},
        }
        r = session.post(f"{API}/listings", json=payload, headers=h)
        assert r.status_code == 200
        lid = r.json()["id"]

        # verify persisted via GET
        r2 = session.get(f"{API}/listings/{lid}")
        assert r2.status_code == 200
        assert r2.json()["title"] == "TEST_Listing"

        # owner/me
        r3 = session.get(f"{API}/listings/owner/me", headers=h)
        assert r3.status_code == 200
        assert any(i["id"] == lid for i in r3.json())

        # delete
        r4 = session.delete(f"{API}/listings/{lid}", headers=h)
        assert r4.status_code == 200

        # verify deleted
        r5 = session.get(f"{API}/listings/{lid}")
        assert r5.status_code == 404

    def test_create_listing_requires_auth(self, session):
        r = session.post(f"{API}/listings", json={"title": "x", "description": "x",
                                                   "category": "tool", "price_per_day": 1,
                                                   "photos": [], "location": {}})
        assert r.status_code == 401


# ----------- Bookings -----------
class TestBookings:
    def test_create_cash_booking_and_handover(self, session, new_user, demo_token):
        h = {"Authorization": f"Bearer {new_user['token']}"}
        owner_h = {"Authorization": f"Bearer {demo_token}"}
        # pick a demo listing (not owned by new_user)
        listings = session.get(f"{API}/listings").json()
        listing = listings[0]

        booking_payload = {
            "listing_id": listing["id"],
            "start_date": "2026-09-01",
            "end_date": "2026-09-03",
        }
        r = session.post(f"{API}/bookings", json=booking_payload, headers=h)
        assert r.status_code == 200, r.text
        b = r.json()
        # days = (end-start).days + 1 = 3
        assert b["days"] == 3
        subtotal = 3 * float(listing["price_per_day"])
        expected = round(subtotal, 2)
        assert b["total_price"] == expected, f"Expected {expected} got {b['total_price']}"
        assert b["service_fee"] == 0
        assert b["payment_method"] == "cash"
        assert b["payment_status"] == "cash_to_collect"
        assert b["status"] == "pending"
        booking_id = b["id"]

        # my bookings
        r2 = session.get(f"{API}/bookings/me", headers=h)
        assert r2.status_code == 200
        items = r2.json()
        assert any(x["id"] == booking_id for x in items)
        assert items[0]["listing"] is not None

        # owner accepts the cash reservation before handover
        accepted = session.patch(f"{API}/bookings/{booking_id}/status", json={"status": "confirmed"}, headers=owner_h)
        assert accepted.status_code == 200, accepted.text
        assert accepted.json()["status"] == "confirmed"

        # rental handover
        pickup = session.post(
            f"{API}/bookings/{booking_id}/inspection",
            json={"kind": "pickup", "condition": "ok", "photos": []},
            headers=h,
        )
        assert pickup.status_code in (200, 201), pickup.text
        assert pickup.json()["booking_status"] == "active"
        returned = session.post(
            f"{API}/bookings/{booking_id}/inspection",
            json={"kind": "return", "condition": "ok", "photos": []},
            headers=h,
        )
        assert returned.status_code in (200, 201), returned.text
        assert returned.json()["booking_status"] == "completed"

    def test_cannot_book_own_listing(self, session, demo_token):
        h = {"Authorization": f"Bearer {demo_token}"}
        # find a demo-owned listing (skip any leaked test listings)
        me = session.get(f"{API}/auth/me", headers=h).json()
        listings = session.get(f"{API}/listings").json()
        own = next((l for l in listings if l["owner_id"] == me["id"]), None)
        assert own is not None, "Demo user should own at least one seeded listing"
        r = session.post(
            f"{API}/bookings",
            json={"listing_id": own["id"], "start_date": "2026-03-01", "end_date": "2026-03-02"},
            headers=h,
        )
        assert r.status_code == 400

    def test_booking_requires_auth(self, session):
        r = session.post(f"{API}/bookings", json={"listing_id": "x", "start_date": "2026-01-01", "end_date": "2026-01-02"})
        assert r.status_code == 401


class TestPaymentsAndSupport:
    def test_support_ticket(self, session, new_user):
        h = {"Authorization": f"Bearer {new_user['token']}"}
        r = session.post(
            f"{API}/support/tickets",
            json={"subject": "Test support", "message": "Besoin d'aide", "category": "test"},
            headers=h,
        )
        assert r.status_code in (200, 201), r.text
        ticket_id = r.json()["id"]

        mine = session.get(f"{API}/support/tickets/me", headers=h)
        assert mine.status_code == 200
        assert any(t["id"] == ticket_id for t in mine.json())
