"""LocaShare backend API tests - full coverage."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://mobility-platform-118.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

DEMO_EMAIL = "demo@locashare.fr"
DEMO_PASSWORD = "demo1234"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def demo_token(session):
    r = session.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
    assert r.status_code == 200, f"Demo login failed: {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def new_user(session):
    """A fresh user who can book demo listings (cannot book own listings)."""
    email = f"TEST_{uuid.uuid4().hex[:8]}@example.com"
    r = session.post(f"{API}/auth/register", json={"email": email, "password": "pass1234", "name": "Test User"})
    assert r.status_code == 200, r.text
    data = r.json()
    return {"email": email, "token": data["access_token"], "id": data["user"]["id"]}


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
    def test_register_and_login(self, session):
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        r = session.post(f"{API}/auth/register", json={"email": email, "password": "pass1234", "name": "Reg User"})
        assert r.status_code == 200
        d = r.json()
        # backend lowercases email
        assert d["user"]["email"] == email.lower()
        assert d["access_token"]

        # duplicate
        r2 = session.post(f"{API}/auth/register", json={"email": email, "password": "pass1234", "name": "Reg User"})
        assert r2.status_code == 400

        # login
        r3 = session.post(f"{API}/auth/login", json={"email": email, "password": "pass1234"})
        assert r3.status_code == 200
        assert r3.json()["access_token"]

    def test_login_demo(self, session, demo_token):
        assert demo_token

    def test_login_invalid(self, session):
        r = session.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": "wrong"})
        assert r.status_code == 401

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
    def test_create_booking_and_checkout(self, session, new_user):
        h = {"Authorization": f"Bearer {new_user['token']}"}
        # pick a demo listing (not owned by new_user)
        listings = session.get(f"{API}/listings").json()
        listing = listings[0]

        booking_payload = {
            "listing_id": listing["id"],
            "start_date": "2026-02-01",
            "end_date": "2026-02-03",
        }
        r = session.post(f"{API}/bookings", json=booking_payload, headers=h)
        assert r.status_code == 200, r.text
        b = r.json()
        # days = (end-start).days + 1 = 3
        assert b["days"] == 3
        # total_price now includes 10% service fee
        subtotal = 3 * float(listing["price_per_day"])
        expected = round(subtotal + round(subtotal * 0.10, 2), 2)
        assert b["total_price"] == expected, f"Expected {expected} got {b['total_price']}"
        assert b["status"] == "pending"
        booking_id = b["id"]

        # my bookings
        r2 = session.get(f"{API}/bookings/me", headers=h)
        assert r2.status_code == 200
        items = r2.json()
        assert any(x["id"] == booking_id for x in items)
        assert items[0]["listing"] is not None

        # stripe checkout session
        r3 = session.post(
            f"{API}/checkout/session",
            json={"booking_id": booking_id, "origin_url": BASE_URL},
            headers=h,
        )
        assert r3.status_code == 200, r3.text
        d = r3.json()
        assert d["url"].startswith("http")
        assert d["session_id"]
        sid = d["session_id"]

        # status
        r4 = session.get(f"{API}/checkout/status/{sid}")
        assert r4.status_code == 200
        st = r4.json()
        assert "status" in st
        assert "payment_status" in st

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
