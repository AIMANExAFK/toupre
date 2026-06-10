// Mock backend for Toupré — replaces FastAPI+MongoDB for local preview
// Phase 2: messagerie, avis, accept/refuse bookings
// Phase 3: vérification email + téléphone, calendrier de disponibilité, push notifications
// Phase 4: système de parrainage
// Phase 5: filtrage de contenu, signalements, coordonnées obligatoires
const http = require("http");

// ═══════════════════════════════════════════════
//  FILTRAGE DE CONTENU
// ═══════════════════════════════════════════════
// Liste de motifs interdits (regex) — couvre insultes, contenu sexuel,
// drogues, armes, fraude, contact direct hors plateforme
const BANNED_PATTERNS = [
  // Insultes / haine (français)
  /\b(connard|connasse|salope|pute|putain|encule[rz]?e?s?|enfoir[ée]s?|nique\s+t[ae]\s+m[èe]re|nique[rz]?e?s?|fdp|ntm|tg|ferme\s+ta\s+gueule|sale\s+(n[èe]gre|arabe|juif|musulman|chr[ée]tien|gay|p[ée]d[ée]))\b/i,
  // Insultes (anglais)
  /\b(fuck|fucking|fucker|asshole|bitch|cunt|nigger|faggot|retard|whore|slut)\b/i,
  // Contenu sexuel / nudité
  /\b(porn|porno|sexe?\s+(gratuit|live|cam)|escort\s+(girl|service)|nude\s+pics?|cul\s+nu|bite|chatte|seins?\s+nus|pipe|fellation|masturbation|webcam\s+x)\b/i,
  // Drogues / substances illégales
  /\b(coca[iï]ne|h[ée]ro[iï]ne|crystal\s+meth|m[ée]thamph[ée]tamine|ecstasy|mdma|lsd|crack|cannabis\s+(à\s+vendre|en\s+vente)|weed\s+for\s+sale|shit\s+marocain|dealer)\b/i,
  // Armes
  /\b(arme\s+(à\s+feu|de\s+poing)|pistolet|revolver|kalachnikov|ak\s*47|fusil\s+d['']assaut|grenade|explosif|tnt|c4)\b/i,
  // Fraude / arnaque / contournement plateforme
  /\b(paiement\s+direct\s+hors\s+(de\s+la\s+)?plateforme|hors\s+(de\s+la\s+)?plateforme|virement\s+(direct|western\s+union)|paypal\s+f(amily|riends)|envoyez\s+(de\s+)?l['']argent\s+(à|sur))\b/i,
  // Coordonnées hors plateforme (numéros de téléphone explicites, emails masqués)
  /\b(0[1-9]\s*([\.\-\s]?\d{2}){4})\b/, // téléphone FR
  /\b([a-zA-Z0-9._%+-]+\s*[@\(at\)]\s*[a-zA-Z0-9.-]+\s*\.\s*[a-zA-Z]{2,})\b/, // email même obfusqué
  /\b(whatsapp|telegram|signal|wechat)\s*[:=]?\s*[\+\d]/i, // contact externe
];

const SOFT_FLAGS = [
  // Mots à signaler en review (pas bloqué mais flagué pour l'admin)
  /\b(urgent+|absolutely\s+free|gratuit{2,}|incroyable|crypto|bitcoin|ethereum|nft|invest)\b/i,
];

function checkContent(text) {
  if (!text || typeof text !== "string") return { blocked: false, reasons: [] };
  const reasons = [];
  for (const pattern of BANNED_PATTERNS) {
    const match = text.match(pattern);
    if (match) reasons.push(`Contenu interdit détecté : "${match[0]}"`);
  }
  const flags = [];
  for (const pattern of SOFT_FLAGS) {
    if (pattern.test(text)) flags.push(true);
  }
  return {
    blocked: reasons.length > 0,
    reasons,
    flagged: flags.length > 0,
  };
}

const CATEGORIES = [
  { id: "all",     label: "Tous",      icon: "apps-outline" },
  { id: "car",     label: "Voitures",  icon: "car-outline" },
  { id: "bike",    label: "Vélos",     icon: "bicycle-outline" },
  { id: "tool",    label: "Outils",    icon: "build-outline" },
  { id: "tech",    label: "Tech",      icon: "laptop-outline" },
  { id: "camping", label: "Camping",   icon: "bonfire-outline" },
  { id: "other",   label: "Autres",    icon: "grid-outline" },
];

const USERS = {
  u1: { id: "u1", email: "demo@locashare.fr", phone: "+33600000000", password: "demo1234", name: "Alexandre D.", avatar: null, created_at: "2024-01-01T00:00:00Z", verified: true,    kyc_status: "verified", kyc_source: "email_phone_otp", contact_verified_at: "2024-01-01T00:00:00Z", referral_code: "ALEXD2024", referred_by: null, credit_balance: 30, push_token: null },
  u2: { id: "u2", email: "sophie@locashare.fr", phone: "+33611111111", name: "Sophie M.",     avatar: null, created_at: "2024-02-15T00:00:00Z", verified: true,  kyc_status: "verified", kyc_source: "email_phone_otp", contact_verified_at: "2024-02-15T00:00:00Z", referral_code: "SOPHIEM",   referred_by: "ALEXD2024", credit_balance: 10, push_token: null },
  u3: { id: "u3", email: "thomas@locashare.fr", phone: "+33622222222", name: "Thomas B.",     avatar: null, created_at: "2024-03-20T00:00:00Z", verified: false, kyc_status: "none",     referral_code: "THOMASB",   referred_by: null, credit_balance: 0, push_token: null },
  u4: { id: "u4", email: "marie@locashare.fr",  phone: "+33633333333", name: "Marie L.",      avatar: null, created_at: "2024-04-10T00:00:00Z", verified: true,  kyc_status: "verified", kyc_source: "email_phone_otp", contact_verified_at: "2024-04-10T00:00:00Z", referral_code: "MARIEL",    referred_by: null, credit_balance: 0, push_token: null },
};

const LISTINGS = [
  { id: "1", title: "BMW Série 3 2021 — Paris", category: "car", price_per_day: 85, description: "Voiture récente, très propre, 40 000 km. Idéale pour un week-end ou un déplacement pro.", photos: ["https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80"], location: { lat: 48.872, lng: 2.331, address: "Paris 17ème" }, owner_id: "u1", owner: { id: "u1", name: "Alexandre D.", avatar: null } },
  { id: "2", title: "Vélo électrique Cowboy 4", category: "bike", price_per_day: 28, description: "Vélo électrique Cowboy 4, autonomie 70 km, application intégrée. Parfait pour explorer Paris.", photos: ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80"], location: { lat: 48.853, lng: 2.349, address: "Paris 5ème" }, owner_id: "u2", owner: { id: "u2", name: "Sophie M.", avatar: null } },
  { id: "3", title: "Perceuse Bosch Professional + kit", category: "tool", price_per_day: 15, description: "Perceuse visseuse sans fil 18V avec 2 batteries, chargeur et 40 forets. Parfait pour tous vos travaux.", photos: ["https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&q=80"], location: { lat: 48.891, lng: 2.247, address: "Levallois-Perret" }, owner_id: "u3", owner: { id: "u3", name: "Thomas B.", avatar: null } },
  { id: "4", title: "DJI Mavic 3 Pro — drone 4K", category: "tech", price_per_day: 120, description: "Drone DJI Mavic 3 Pro avec 3 caméras, autonomie 46 min, inclut mallette de transport et 4 batteries.", photos: ["https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=800&q=80"], location: { lat: 48.840, lng: 2.389, address: "Paris 13ème" }, owner_id: "u1", owner: { id: "u1", name: "Alexandre D.", avatar: null } },
  { id: "5", title: "Tente 4 places Quechua + sacs de couchage", category: "camping", price_per_day: 22, description: "Tente facile à monter (2 min), imperméable, avec 4 sacs de couchage -5°C inclus.", photos: ["https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&q=80"], location: { lat: 48.821, lng: 2.301, address: "Paris 14ème" }, owner_id: "u4", owner: { id: "u4", name: "Marie L.", avatar: null } },
  { id: "6", title: "Renault Zoe électrique 2022", category: "car", price_per_day: 55, description: "Citadine électrique 100% charge incluse, autonomie 300 km WLTP. Chargeur rapide fourni.", photos: ["https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=800&q=80"], location: { lat: 48.878, lng: 2.360, address: "Paris 10ème" }, owner_id: "u2", owner: { id: "u2", name: "Sophie M.", avatar: null } },
  { id: "7", title: "MacBook Pro M3 14 pouces", category: "tech", price_per_day: 45, description: "MacBook Pro M3 14 pouces, 16 Go RAM, 512 Go SSD. Parfait pour du montage vidéo ou du développement.", photos: ["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80"], location: { lat: 48.864, lng: 2.319, address: "Paris 9ème" }, owner_id: "u3", owner: { id: "u3", name: "Thomas B.", avatar: null } },
  { id: "8", title: "Trottinette électrique Segway Max G2", category: "other", price_per_day: 18, description: "Trottinette électrique 25 km/h, autonomie 70 km, pliable. Idéale pour les déplacements urbains.", photos: ["https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=800&q=80"], location: { lat: 48.832, lng: 2.334, address: "Paris 15ème" }, owner_id: "u4", owner: { id: "u4", name: "Marie L.", avatar: null } },
];

// In-memory persistence (resets at restart)
const BOOKINGS = [
  // Une réservation demo en attente (Sophie veut louer la BMW d'Alexandre)
  { id: "b_seed1", listing_id: "1", user_id: "u2", renter_id: "u2", owner_id: "u1", start_date: "2026-05-20", end_date: "2026-05-22", days: 3, total_price: 255, service_fee: 0, status: "pending", payment_method: "cash", payment_status: "cash_to_collect", created_at: new Date(Date.now() - 86400000).toISOString(), renter: USERS.u2, listing: null },
];
const MESSAGES = [
  { id: "m_seed1", from_id: "u2", to_id: "u1", content: "Bonjour, je suis intéressée par votre BMW pour ce week-end !", listing_id: "1", read: false, created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: "m_seed2", from_id: "u1", to_id: "u2", content: "Bonjour Sophie ! Oui c'est disponible. Vous voulez la récupérer où ?", listing_id: "1", read: true, created_at: new Date(Date.now() - 3000000).toISOString() },
];
function publicUser(u) {
  if (!u) return null;
  return { id: u.id, name: u.name, avatar: u.avatar, verified: !!u.verified, kyc_status: u.kyc_status || "none", created_at: u.created_at };
}

function meUser(u) {
  if (!u) return null;
  return { id: u.id, email: u.email, phone: u.phone || null, name: u.name, avatar: u.avatar, verified: !!u.verified, kyc_status: u.kyc_status || "none", kyc_source: u.kyc_source, contact_verified_at: u.contact_verified_at, referral_code: u.referral_code, credit_balance: u.credit_balance || 0, referred_by: u.referred_by || null, created_at: u.created_at };
}

// Notifications (in-memory queue)
const NOTIFICATIONS = []; // { id, user_id, type, title, body, data, read, created_at }

// Signalements (in-memory)
const REPORTS = []; // { id, reporter_id, target_type, target_id, category, reason, status, created_at }
const PAYMENT_METHODS = [
  { id: "pm_demo_visa", user_id: "u1", brand: "visa", last4: "4242", exp_month: 12, exp_year: 2028, is_default: true, provider: "local_vault", created_at: new Date(Date.now() - 3 * 86400000).toISOString() },
];
const PAYMENT_TRANSACTIONS = [];
const SUPPORT_TICKETS = [];
const BOOKING_INSPECTIONS = [];
const DISPUTES = [];
const ACTIVE_BOOKING_STATUSES = new Set(["confirmed", "paid", "active"]);

// OTP / Magic link store : email → { code, expires_at, attempts }
const OTP_STORE = new Map();
// France Connect state : state_token → { email, started_at, status }
const FC_STORE = new Map();
// Passkeys store : credential_id → { user_id, public_key (mock), created_at, last_used_at }
const PASSKEYS = [];
// Sessions actives : token → { user_id, device, ip, created_at, last_seen }
const SESSIONS = new Map();

function genOTP() { return String(Math.floor(100000 + Math.random() * 900000)); }
function genToken() { return "tk_" + Math.random().toString(36).slice(2) + Date.now().toString(36); }
function userByEmail(email) {
  return Object.values(USERS).find((u) => u.email?.toLowerCase() === (email || "").toLowerCase());
}
function normalizePhone(phone) {
  let value = String(phone || "").trim().replace("(0)", "");
  if (value.startsWith("00")) value = "+" + value.slice(2);
  const digits = value.replace(/\D/g, "");
  let normalized;
  if (value.startsWith("+")) normalized = "+" + digits;
  else if (digits.startsWith("0") && digits.length === 10) normalized = "+33" + digits.slice(1);
  else if (digits.startsWith("33") && digits.length === 11) normalized = "+" + digits;
  else normalized = digits.length >= 8 ? "+" + digits : digits;
  if (!/^\+\d{8,15}$/.test(normalized)) return null;
  return normalized;
}
function userByPhone(phone) {
  const normalized = normalizePhone(phone);
  return Object.values(USERS).find((u) => normalizePhone(u.phone) === normalized);
}
function startSession(userId, device) {
  const token = "mock_jwt_" + userId + "_" + Date.now();
  SESSIONS.set(token, {
    token,
    user_id: userId,
    device: device || "Web",
    ip: "127.0.0.1",
    created_at: new Date().toISOString(),
    last_seen: new Date().toISOString(),
  });
  return token;
}
function userFromRequest(req) {
  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  if (token === "mock_jwt_token_demo") return DEMO_USER;
  const session = SESSIONS.get(token);
  if (session) {
    session.last_seen = new Date().toISOString();
    return USERS[session.user_id] || null;
  }
  if (token.startsWith("mock_jwt_token_")) {
    const id = token.slice("mock_jwt_token_".length);
    return USERS[id] || null;
  }
  return null;
}
function requireUser(req, res) {
  const user = userFromRequest(req);
  if (!user) {
    json(res, { detail: "Not authenticated" }, 401);
    return null;
  }
  return user;
}
function notify(userId, type, title, body, data = {}) {
  const n = {
    id: "n_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    user_id: userId, type, title, body, data,
    read: false, created_at: new Date().toISOString(),
  };
  NOTIFICATIONS.push(n);
  console.log(`[notif] → ${userId}: ${title}`);
  return n;
}

function dateOnly(value) {
  return new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
}

function dateRange(startDate, endDate) {
  const dates = [];
  for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function bookingOverlaps(start, end, booking) {
  const otherStart = dateOnly(booking.start_date);
  const otherEnd = dateOnly(booking.end_date);
  return start <= otherEnd && end >= otherStart;
}

const REVIEWS = [
  { id: "r_seed1", listing_id: "2", author_id: "u1", author: publicUser(USERS.u1), rating: 5, comment: "Super vélo, batterie nickel, propriétaire très sympa !", created_at: new Date(Date.now() - 7 * 86400000).toISOString() },
  { id: "r_seed2", listing_id: "2", author_id: "u3", author: publicUser(USERS.u3), rating: 4, comment: "Très bon vélo. Juste un peu lourd à porter dans les escaliers.", created_at: new Date(Date.now() - 14 * 86400000).toISOString() },
  { id: "r_seed3", listing_id: "1", author_id: "u4", author: publicUser(USERS.u4), rating: 5, comment: "Voiture impeccable, conforme à l'annonce. Je recommande !", created_at: new Date(Date.now() - 21 * 86400000).toISOString() },
];

const DEMO_USER = USERS.u1;
const PORT = 8000;

function json(res, data, status = 200) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    // Sans Max-Age le navigateur re-préflight chaque requête (cache par défaut : 5s),
    // ce qui double le trafic visible sur les endpoints pollés
    "Access-Control-Max-Age": "600",
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try { resolve(JSON.parse(body)); } catch { resolve({}); }
    });
  });
}

// Helpers reviews
function aggregateRating(listingId) {
  const items = REVIEWS.filter((r) => r.listing_id === listingId);
  if (!items.length) return { rating: null, count: 0 };
  const avg = items.reduce((s, r) => s + r.rating, 0) / items.length;
  return { rating: Math.round(avg * 10) / 10, count: items.length };
}
function listingWithRating(l) {
  return { ...l, owner: publicUser(USERS[l.owner_id]) || l.owner, ...aggregateRating(l.id) };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  const method = req.method;

  if (method === "OPTIONS") return json(res, {});

  if ((path === "/" || path === "/api/" || path === "/api") && method === "GET") {
    return json(res, { name: "Toupré API mock", status: "ok", demo: "demo@locashare.fr / demo1234" });
  }

  // ─── AUTH ─────────────────────────────────────
  if (path === "/api/auth/login" && method === "POST") {
    const body = await parseBody(req);
    const user = userByEmail(body.email);
    if (user && user.password === body.password) {
      const token = user.id === DEMO_USER.id ? "mock_jwt_token_demo" : startSession(user.id, body.device || "Web");
      return json(res, { access_token: token, user: meUser(user) });
    }
    return json(res, { detail: "Identifiants incorrects" }, 401);
  }

  if (path === "/api/auth/register" && method === "POST") {
    const body = await parseBody(req);
    const email = (body.email || "").toLowerCase().trim();
    if (!email || !body.password || !body.name) {
      return json(res, { detail: "Email, mot de passe et nom requis" }, 400);
    }
    if (userByEmail(email)) {
      return json(res, { detail: "Un compte existe déjà avec cet email" }, 400);
    }
    // Si referral_code valide → crédite parrain + filleul
    let credit_balance = 0;
    let referred_by = null;
    if (body.referral_code) {
      const sponsor = Object.values(USERS).find((u) => u.referral_code === body.referral_code.toUpperCase());
      if (sponsor) {
        sponsor.credit_balance = (sponsor.credit_balance || 0) + 10;
        credit_balance = 10;
        referred_by = sponsor.referral_code;
        notify(sponsor.id, "referral_credit", "🎉 Nouveau filleul !", `${body.name} s'est inscrit avec votre code. +10€ crédités !`);
      }
    }
    const newUser = {
      id: "u_new_" + Date.now(),
      email, password: body.password, name: body.name, avatar: null,
      created_at: new Date().toISOString(),
      verified: false, kyc_status: "none",
      referral_code: (body.name || "USER").replace(/\s/g, "").toUpperCase().slice(0, 6) + Date.now().toString(36).slice(-3).toUpperCase(),
      referred_by, credit_balance, push_token: null,
    };
    USERS[newUser.id] = newUser;
    return json(res, { access_token: startSession(newUser.id, body.device || "Web"), user: meUser(newUser) });
  }

  if (path === "/api/auth/me" && method === "GET") {
    const user = requireUser(req, res);
    if (!user) return;
    return json(res, meUser(user));
  }

  // ─── CATEGORIES ───────────────────────────────
  if (path === "/api/categories" && method === "GET") return json(res, CATEGORIES);

  // ─── LISTINGS ─────────────────────────────────
  if (path === "/api/listings" && method === "GET") {
    const cat = url.searchParams.get("category");
    const q = url.searchParams.get("q");
    let data = cat && cat !== "all" ? LISTINGS.filter((l) => l.category === cat) : LISTINGS;
    if (q) {
      const ql = q.toLowerCase();
      data = data.filter((l) => l.title.toLowerCase().includes(ql) || l.description.toLowerCase().includes(ql));
    }
    return json(res, data.map(listingWithRating));
  }

  if ((path === "/api/listings/owner/me" || path === "/api/my-listings") && method === "GET") {
    const user = requireUser(req, res);
    if (!user) return;
    return json(res, LISTINGS.filter((l) => l.owner_id === user.id).map(listingWithRating));
  }

  if (path.match(/^\/api\/listings\/[\w-]+$/) && method === "GET") {
    const id = path.split("/").pop();
    const item = LISTINGS.find((l) => l.id === id);
    if (!item) return json(res, { detail: "Not found" }, 404);
    return json(res, listingWithRating(item));
  }

  if (path === "/api/listings" && method === "POST") {
    const user = requireUser(req, res);
    if (!user) return;
    const body = await parseBody(req);

    // ─── Filtrage de contenu ───
    const combined = `${body.title || ""} ${body.description || ""}`;
    const check = checkContent(combined);
    if (check.blocked) {
      return json(res, {
        detail: "Votre annonce contient du contenu interdit.",
        code: "CONTENT_BLOCKED",
        reasons: check.reasons,
      }, 400);
    }

    const newItem = {
      id: String(Date.now()), ...body,
      owner_id: user.id,
      owner: publicUser(user),
      flagged_for_review: check.flagged,
      created_at: new Date().toISOString(),
    };
    LISTINGS.push(newItem);
    return json(res, listingWithRating(newItem));
  }

  if (path.match(/^\/api\/listings\/[\w-]+$/) && method === "PATCH") {
    const user = requireUser(req, res);
    if (!user) return;
    const body = await parseBody(req);
    const id = path.split("/").pop();
    const idx = LISTINGS.findIndex((l) => l.id === id);
    if (idx === -1) return json(res, { detail: "Not found" }, 404);
    if (LISTINGS[idx].owner_id !== user.id) return json(res, { detail: "Forbidden" }, 403);
    LISTINGS[idx] = { ...LISTINGS[idx], ...body };
    return json(res, listingWithRating(LISTINGS[idx]));
  }

  if (path.match(/^\/api\/listings\/[\w-]+$/) && method === "DELETE") {
    const user = requireUser(req, res);
    if (!user) return;
    const id = path.split("/").pop();
    const idx = LISTINGS.findIndex((l) => l.id === id);
    if (idx === -1) return json(res, { detail: "Not found" }, 404);
    if (LISTINGS[idx].owner_id !== user.id) return json(res, { detail: "Forbidden" }, 403);
    LISTINGS.splice(idx, 1);
    return json(res, { ok: true });
  }

  // ─── BOOKINGS ─────────────────────────────────
  // Mes réservations en tant que locataire
  if ((path === "/api/bookings/me" || path === "/api/bookings") && method === "GET") {
    const user = requireUser(req, res);
    if (!user) return;
    const data = BOOKINGS.filter((b) => (b.renter_id || b.user_id) === user.id).map((b) => ({
      ...b,
      listing: LISTINGS.find((l) => l.id === b.listing_id) || b.listing,
    }));
    return json(res, data);
  }

  // Demandes reçues en tant que propriétaire
  if (path === "/api/bookings/owner/me" && method === "GET") {
    const user = requireUser(req, res);
    if (!user) return;
    const data = BOOKINGS.filter((b) => b.owner_id === user.id).map((b) => ({
      ...b,
      listing: LISTINGS.find((l) => l.id === b.listing_id) || b.listing,
      renter: publicUser(USERS[b.renter_id || b.user_id]) || b.renter,
    }));
    return json(res, data);
  }

  if (path === "/api/bookings" && method === "POST") {
    const user = requireUser(req, res);
    if (!user) return;
    const body = await parseBody(req);
    const listing = LISTINGS.find((l) => l.id === body.listing_id);
    if (!listing) return json(res, { detail: "Listing introuvable" }, 404);
    if (listing.owner_id === user.id) return json(res, { detail: "Impossible de réserver votre propre annonce" }, 400);
    if (!user.verified) {
      return json(res, {
        detail: "Vérification email et téléphone requise pour réserver.",
        code: "KYC_REQUIRED",
        action: "/auth/otp?reason=booking",
      }, 403);
    }

    const start = dateOnly(body.start_date);
    const end = dateOnly(body.end_date);
    const today = dateOnly(new Date().toISOString().slice(0, 10));
    if (start < today) return json(res, { detail: "Start date cannot be in the past" }, 400);
    if (end < start) return json(res, { detail: "End date must be after start date" }, 400);
    const requestedDates = new Set(dateRange(start, end));
    const blocked = new Set(listing.blocked_dates || []);
    const blockedOverlap = [...requestedDates].filter((d) => blocked.has(d));
    const bookingConflict = BOOKINGS.find(
      (b) => b.listing_id === listing.id && ACTIVE_BOOKING_STATUSES.has(b.status) && bookingOverlaps(start, end, b)
    );
    if (blockedOverlap.length || bookingConflict) {
      return json(res, {
        detail: "Ces dates ne sont plus disponibles.",
        code: "DATES_UNAVAILABLE",
        type: blockedOverlap.length ? "blocked_dates" : "bookings",
        refs: blockedOverlap.length ? blockedOverlap : [bookingConflict.id],
      }, 409);
    }
    const computedDays = Math.max(1, Math.round((end - start) / 86400000) + 1);
    const days = body.days || computedDays;
    const subtotal = listing.price_per_day * days;
    const serviceFee = 0;
    const total = Math.round(subtotal * 100) / 100;
    const booking = {
      id: "b_" + Date.now(),
      listing_id: body.listing_id, user_id: user.id, renter_id: user.id, owner_id: listing.owner_id,
      start_date: body.start_date, end_date: body.end_date, days,
      total_price: total, service_fee: serviceFee,
      payment_method: "cash",
      payment_status: "cash_to_collect",
      status: "pending", created_at: new Date().toISOString(),
      renter: publicUser(user),
      listing: listingWithRating(listing),
    };
    BOOKINGS.push(booking);
    notify(listing.owner_id, "booking_request", "📅 Nouvelle demande de réservation", `${user.name} souhaite louer "${listing.title}" du ${body.start_date} au ${body.end_date}.`, { booking_id: booking.id });
    return json(res, booking);
  }

  // accept / refuse / cancel / mark as paid
  if (path.match(/^\/api\/bookings\/[\w-]+$/) && method === "PATCH") {
    const body = await parseBody(req);
    const id = path.split("/").pop();
    const idx = BOOKINGS.findIndex((b) => b.id === id);
    if (idx === -1) return json(res, { detail: "Not found" }, 404);
    const prev = BOOKINGS[idx];
    BOOKINGS[idx] = { ...prev, ...body, updated_at: new Date().toISOString() };
    // Notification au locataire si statut a changé
    if (body.status && body.status !== prev.status) {
      const listing = LISTINGS.find((l) => l.id === prev.listing_id);
      const titles = {
        confirmed: ["✅ Réservation acceptée", `Votre demande pour "${listing?.title || ""}" a été acceptée.`],
        refused:   ["❌ Réservation refusée", `Votre demande pour "${listing?.title || ""}" a été refusée.`],
        paid:      ["💸 Paiement confirmé", `Le paiement de votre réservation "${listing?.title || ""}" est confirmé.`],
        cancelled: ["🚫 Réservation annulée", `La réservation pour "${listing?.title || ""}" a été annulée.`],
        active:    ["🔑 Location démarrée", `La location "${listing?.title || ""}" a démarré.`],
        completed: ["✅ Location terminée", `La location "${listing?.title || ""}" est terminée.`],
        disputed:  ["⚠️ Litige ouvert", `Un litige est ouvert pour "${listing?.title || ""}".`],
      };
      const t = titles[body.status];
      if (t) notify(prev.user_id, "booking_" + body.status, t[0], t[1], { booking_id: id });
    }
    return json(res, BOOKINGS[idx]);
  }

  if ((path === "/api/checkout/session" || path === "/api/checkout/create") && method === "POST") {
    return json(res, {
      detail: "Le checkout en ligne est désactivé. Cette réservation se règle en espèces à la remise.",
    }, 410);
    const body = await parseBody(req);
    const user = requireUser(req, res);
    if (!user) return;
    const sid = "local_cs_" + Date.now();
    // Stocke le mapping booking → session pour le polling
    if (body.booking_id) {
      const b = BOOKINGS.find((b) => b.id === body.booking_id);
      if (b) {
        b.stripe_session_id = sid;
        b.payment_session_id = sid;
        b.status = "paid";
        PAYMENT_TRANSACTIONS.push({
          session_id: sid,
          booking_id: b.id,
          user_id: user.id,
          amount: b.total_price,
          currency: "eur",
          status: "complete",
          payment_status: "paid",
          provider: "local_fallback",
          created_at: new Date().toISOString(),
        });
        notify(b.owner_id, "booking_paid", "Paiement confirmé", "Le paiement de la réservation a été confirmé.", { booking_id: b.id, session_id: sid });
      }
    }
    const origin = (body.origin_url || "http://localhost:4174").replace(/\/$/, "");
    return json(res, { url: `${origin}/payment-success?session_id=${sid}`, session_id: sid, provider: "local_fallback" });
  }

  if (path.match(/^\/api\/checkout\/status\//) && method === "GET") {
    return json(res, {
      detail: "Le checkout en ligne est désactivé. Les réservations se règlent en espèces à la remise.",
    }, 410);
    // En mock, on simule un paiement réussi instantané + on marque la booking comme paid
    const sid = path.split("/").pop();
    const b = BOOKINGS.find((b) => b.stripe_session_id === sid);
    if (b && b.status !== "paid") b.status = "paid";
    const tx = PAYMENT_TRANSACTIONS.find((t) => t.session_id === sid);
    return json(res, { status: "complete", payment_status: "paid", booking_id: b?.id || null, amount_total: Math.round((tx?.amount || b?.total_price || 0) * 100), currency: "eur", provider: tx?.provider || "local_fallback" });
  }

  if (path === "/api/webhook/stripe" && method === "POST") {
    const body = await parseBody(req);
    // Simulation : si l'event est "checkout.session.completed", on marque payée
    const sid = body?.data?.object?.id;
    if (sid) {
      const b = BOOKINGS.find((b) => b.stripe_session_id === sid);
      if (b) b.status = "paid";
    }
    return json(res, { received: true });
  }

  // ─── PAYMENT METHODS désactivés ─────────────
  if (path === "/api/payment-methods" && method === "GET") {
    return json(res, {
      detail: "Les paiements en ligne sont désactivés. Le règlement se fait en espèces entre utilisateurs.",
    }, 410);
    const user = requireUser(req, res);
    if (!user) return;
    return json(res, PAYMENT_METHODS.filter((m) => m.user_id === user.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
  }

  if (path === "/api/payment-methods" && method === "POST") {
    return json(res, {
      detail: "Les cartes ne sont pas acceptées pour le moment. Le règlement se fait en espèces.",
    }, 410);
    const user = requireUser(req, res);
    if (!user) return;
    const body = await parseBody(req);
    const last4 = String(body.last4 || "").replace(/\D/g, "");
    if (last4.length !== 4) return json(res, { detail: "last4 must contain 4 digits" }, 400);
    const isDefault = body.is_default !== false || !PAYMENT_METHODS.some((m) => m.user_id === user.id);
    if (isDefault) PAYMENT_METHODS.forEach((m) => { if (m.user_id === user.id) m.is_default = false; });
    const methodItem = {
      id: "pm_" + Date.now(),
      user_id: user.id,
      brand: String(body.brand || "card").toLowerCase(),
      last4,
      exp_month: Number(body.exp_month || 1),
      exp_year: Number(body.exp_year || 2030),
      holder_name: body.holder_name || null,
      is_default: isDefault,
      provider: "local_vault",
      created_at: new Date().toISOString(),
    };
    PAYMENT_METHODS.push(methodItem);
    return json(res, methodItem, 201);
  }

  if (path.match(/^\/api\/payment-methods\/[\w-]+\/default$/) && method === "PATCH") {
    return json(res, {
      detail: "Les cartes ne sont pas acceptées pour le moment. Le règlement se fait en espèces.",
    }, 410);
    const user = requireUser(req, res);
    if (!user) return;
    const id = path.split("/")[3];
    const methodItem = PAYMENT_METHODS.find((m) => m.id === id && m.user_id === user.id);
    if (!methodItem) return json(res, { detail: "Payment method not found" }, 404);
    PAYMENT_METHODS.forEach((m) => { if (m.user_id === user.id) m.is_default = false; });
    methodItem.is_default = true;
    return json(res, methodItem);
  }

  if (path.match(/^\/api\/payment-methods\/[\w-]+$/) && method === "DELETE") {
    return json(res, {
      detail: "Les cartes ne sont pas acceptées pour le moment. Le règlement se fait en espèces.",
    }, 410);
    const user = requireUser(req, res);
    if (!user) return;
    const id = path.split("/").pop();
    const idx = PAYMENT_METHODS.findIndex((m) => m.id === id && m.user_id === user.id);
    if (idx === -1) return json(res, { detail: "Payment method not found" }, 404);
    const wasDefault = PAYMENT_METHODS[idx].is_default;
    PAYMENT_METHODS.splice(idx, 1);
    if (wasDefault) {
      const next = PAYMENT_METHODS.find((m) => m.user_id === user.id);
      if (next) next.is_default = true;
    }
    return json(res, { ok: true });
  }

  // ─── SUPPORT ─────────────────────────────────
  if (path === "/api/support/tickets" && method === "POST") {
    const user = userFromRequest(req);
    const body = await parseBody(req);
    if (!user && !body.email) return json(res, { detail: "Connectez-vous ou fournissez un email" }, 401);
    if (!String(body.subject || "").trim() || !String(body.message || "").trim()) {
      return json(res, { detail: "Sujet et message requis" }, 400);
    }
    const ticket = {
      id: "sup_" + Date.now(),
      user_id: user?.id || null,
      email: user?.email || body.email,
      name: user?.name || body.name || "",
      subject: String(body.subject).trim(),
      category: body.category || "general",
      booking_id: body.booking_id || null,
      status: "open",
      priority: "normal",
      messages: [{ id: "sup_msg_" + Date.now(), from: "user", message: String(body.message).trim(), created_at: new Date().toISOString() }],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      email_queued: false,
    };
    SUPPORT_TICKETS.push(ticket);
    if (user) notify(user.id, "support_ticket", "Demande support reçue", `Ticket ${ticket.id.slice(0, 8)} ouvert.`, { ticket_id: ticket.id });
    return json(res, ticket, 201);
  }

  if (path === "/api/support/tickets/me" && method === "GET") {
    const user = requireUser(req, res);
    if (!user) return;
    return json(res, SUPPORT_TICKETS.filter((t) => t.user_id === user.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
  }

  if (path.match(/^\/api\/support\/tickets\/[\w-]+\/messages$/) && method === "POST") {
    const user = requireUser(req, res);
    if (!user) return;
    const id = path.split("/")[4];
    const body = await parseBody(req);
    const ticket = SUPPORT_TICKETS.find((t) => t.id === id && t.user_id === user.id);
    if (!ticket) return json(res, { detail: "Support ticket not found" }, 404);
    const item = { id: "sup_msg_" + Date.now(), from: "user", message: String(body.message || "").trim(), created_at: new Date().toISOString() };
    if (!item.message) return json(res, { detail: "Message requis" }, 400);
    ticket.messages.push(item);
    ticket.updated_at = new Date().toISOString();
    return json(res, item, 201);
  }

  // ─── INSPECTIONS / DISPUTES ──────────────────
  if (path.match(/^\/api\/bookings\/[\w-]+\/inspection$/) && method === "POST") {
    const user = requireUser(req, res);
    if (!user) return;
    const bookingId = path.split("/")[3];
    const booking = BOOKINGS.find((b) => b.id === bookingId);
    if (!booking) return json(res, { detail: "Booking not found" }, 404);
    if (![booking.owner_id, booking.renter_id || booking.user_id].includes(user.id)) return json(res, { detail: "Forbidden" }, 403);
    const body = await parseBody(req);
    if (!["pickup", "return"].includes(body.kind)) return json(res, { detail: "kind must be pickup or return" }, 400);
    if (body.kind === "pickup" && !["confirmed", "paid"].includes(booking.status)) return json(res, { detail: "Pickup can only start after confirmation or payment" }, 400);
    if (body.kind === "return" && booking.status !== "active") return json(res, { detail: "Return can only be confirmed while booking is active" }, 400);
    const condition = body.condition || "ok";
    const nextStatus = ["issue", "damaged"].includes(condition) ? "disputed" : (body.kind === "pickup" ? "active" : "completed");
    const inspection = {
      id: "insp_" + Date.now(),
      booking_id: booking.id,
      user_id: user.id,
      kind: body.kind,
      condition,
      notes: body.notes || "",
      photos: Array.isArray(body.photos) ? body.photos : [],
      created_at: new Date().toISOString(),
      booking_status: nextStatus,
    };
    BOOKING_INSPECTIONS.push(inspection);
    booking.status = nextStatus;
    booking.updated_at = new Date().toISOString();
    const otherUserId = user.id === booking.owner_id ? (booking.renter_id || booking.user_id) : booking.owner_id;
    notify(otherUserId, "booking_inspection", "État des lieux ajouté", `Un état des lieux ${body.kind} a été ajouté.`, { booking_id: booking.id, inspection_id: inspection.id });
    return json(res, inspection, 201);
  }

  if (path.match(/^\/api\/bookings\/[\w-]+\/inspections$/) && method === "GET") {
    const user = requireUser(req, res);
    if (!user) return;
    const bookingId = path.split("/")[3];
    const booking = BOOKINGS.find((b) => b.id === bookingId);
    if (!booking) return json(res, { detail: "Booking not found" }, 404);
    if (![booking.owner_id, booking.renter_id || booking.user_id].includes(user.id)) return json(res, { detail: "Forbidden" }, 403);
    return json(res, BOOKING_INSPECTIONS.filter((i) => i.booking_id === bookingId));
  }

  if (path === "/api/disputes" && method === "POST") {
    const user = requireUser(req, res);
    if (!user) return;
    const body = await parseBody(req);
    const booking = BOOKINGS.find((b) => b.id === body.booking_id);
    if (!booking) return json(res, { detail: "Booking not found" }, 404);
    if (![booking.owner_id, booking.renter_id || booking.user_id].includes(user.id)) return json(res, { detail: "Forbidden" }, 403);
    const dispute = {
      id: "disp_" + Date.now(),
      booking_id: booking.id,
      listing_id: booking.listing_id,
      opened_by: user.id,
      owner_id: booking.owner_id,
      renter_id: booking.renter_id || booking.user_id,
      reason: body.reason || "other",
      description: body.description || "",
      photos: Array.isArray(body.photos) ? body.photos : [],
      status: "open",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    DISPUTES.push(dispute);
    booking.status = "disputed";
    const otherUserId = user.id === booking.owner_id ? (booking.renter_id || booking.user_id) : booking.owner_id;
    notify(otherUserId, "dispute_opened", "Litige ouvert", "Un litige a été ouvert sur une réservation.", { booking_id: booking.id, dispute_id: dispute.id });
    return json(res, dispute, 201);
  }

  if (path === "/api/disputes/me" && method === "GET") {
    const user = requireUser(req, res);
    if (!user) return;
    return json(res, DISPUTES.filter((d) => d.owner_id === user.id || d.renter_id === user.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
  }

  // ─── MESSAGES ─────────────────────────────────
  // Liste des conversations de l'utilisateur (groupées par interlocuteur)
  if (path === "/api/conversations" && method === "GET") {
    const me = DEMO_USER.id;
    const byPeer = new Map();
    for (const m of MESSAGES) {
      if (m.from_id !== me && m.to_id !== me) continue;
      const peerId = m.from_id === me ? m.to_id : m.from_id;
      const prev = byPeer.get(peerId);
      if (!prev || new Date(m.created_at) > new Date(prev.created_at)) {
        byPeer.set(peerId, m);
      }
    }
    const convs = [...byPeer.entries()].map(([peerId, lastMsg]) => {
      const peer = USERS[peerId] || { id: peerId, name: "Utilisateur", avatar: null };
      const unread = MESSAGES.filter((m) => m.from_id === peerId && m.to_id === me && !m.read).length;
      const listing = lastMsg.listing_id ? LISTINGS.find((l) => l.id === lastMsg.listing_id) : null;
      return {
        peer_id: peerId, peer: { id: peer.id, name: peer.name, avatar: peer.avatar },
        last_message: lastMsg.content, last_at: lastMsg.created_at,
        unread, listing,
      };
    });
    convs.sort((a, b) => new Date(b.last_at) - new Date(a.last_at));
    return json(res, convs);
  }

  // Conversation avec un utilisateur précis
  if (path.match(/^\/api\/conversations\/[\w-]+$/) && method === "GET") {
    const peerId = path.split("/").pop();
    const me = DEMO_USER.id;
    const thread = MESSAGES.filter(
      (m) => (m.from_id === me && m.to_id === peerId) || (m.from_id === peerId && m.to_id === me)
    ).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    // Marquer comme lus les messages reçus
    MESSAGES.forEach((m) => { if (m.from_id === peerId && m.to_id === me) m.read = true; });
    const peer = USERS[peerId] || { id: peerId, name: "Utilisateur", avatar: null };
    return json(res, { peer: { id: peer.id, name: peer.name, avatar: peer.avatar }, messages: thread });
  }

  if (path === "/api/messages" && method === "POST") {
    const body = await parseBody(req);

    // ─── Coordonnées vérifiées obligatoires pour envoyer un message ───
    if (!DEMO_USER.verified) {
      return json(res, {
        detail: "Vérification email et téléphone requise pour contacter un propriétaire.",
        code: "KYC_REQUIRED",
        action: "/auth/otp?reason=message",
      }, 403);
    }

    // ─── Filtrage de contenu ───
    const check = checkContent(body.content);
    if (check.blocked) {
      return json(res, {
        detail: "Votre message contient du contenu interdit ou des informations de contact externes (téléphone, email, WhatsApp...). Restez sur la plateforme pour votre sécurité.",
        code: "CONTENT_BLOCKED",
        reasons: check.reasons,
      }, 400);
    }

    const msg = {
      id: "m_" + Date.now(),
      from_id: DEMO_USER.id, to_id: body.to_id,
      content: body.content, listing_id: body.listing_id || null,
      read: false, created_at: new Date().toISOString(),
      flagged: check.flagged,
    };
    MESSAGES.push(msg);
    notify(body.to_id, "new_message", `💬 Nouveau message de ${DEMO_USER.name}`, body.content.slice(0, 80), { from_id: DEMO_USER.id });
    // Auto-reply après 2s pour simuler la conversation (mode demo)
    if (body.auto_reply !== false) {
      setTimeout(() => {
        MESSAGES.push({
          id: "m_" + Date.now() + "_reply",
          from_id: body.to_id, to_id: DEMO_USER.id,
          content: "Merci pour votre message, je vous réponds rapidement !",
          listing_id: body.listing_id || null,
          read: false, created_at: new Date().toISOString(),
        });
      }, 2500);
    }
    return json(res, msg, 201);
  }

  // Compteur de messages non lus
  if (path === "/api/messages/unread-count" && method === "GET") {
    const count = MESSAGES.filter((m) => m.to_id === DEMO_USER.id && !m.read).length;
    return json(res, { count });
  }

  // ─── REVIEWS ──────────────────────────────────
  if (path.match(/^\/api\/reviews\/listing\/[\w-]+$/) && method === "GET") {
    const id = path.split("/").pop();
    const items = REVIEWS.filter((r) => r.listing_id === id).sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
    const agg = aggregateRating(id);
    return json(res, { reviews: items, ...agg });
  }

  if (path === "/api/reviews" && method === "POST") {
    const body = await parseBody(req);
    const review = {
      id: "r_" + Date.now(),
      listing_id: body.listing_id, booking_id: body.booking_id || null,
      author_id: DEMO_USER.id, author: { id: DEMO_USER.id, name: DEMO_USER.name, avatar: null },
      rating: Math.max(1, Math.min(5, parseInt(body.rating) || 5)),
      comment: body.comment || "",
      created_at: new Date().toISOString(),
    };
    REVIEWS.push(review);
    return json(res, review, 201);
  }

  // Reviews à laisser (bookings payées sans review encore)
  if (path === "/api/reviews/pending" && method === "GET") {
    const me = DEMO_USER.id;
    const reviewed = new Set(REVIEWS.filter((r) => r.author_id === me).map((r) => r.listing_id));
    const pending = BOOKINGS.filter((b) => (b.renter_id || b.user_id) === me && ["paid", "returned", "completed"].includes(b.status) && !reviewed.has(b.listing_id))
      .map((b) => ({ booking: b, listing: LISTINGS.find((l) => l.id === b.listing_id) }));
    return json(res, pending);
  }

  // ═══════════════════════════════════════════════
  //  PHASE 3 — KYC / Calendrier / Push notifs
  // ═══════════════════════════════════════════════

  // KYC : upload pièce d'identité (mock — accepte n'importe quoi puis passe en "pending")
  if (path === "/api/kyc/submit" && method === "POST") {
    const user = requireUser(req, res);
    if (!user) return;
    const body = await parseBody(req);
    if (!body.document_type || !body.document_image) {
      return json(res, { detail: "Type et image requis" }, 400);
    }
    user.kyc_status = "pending";
    // Auto-validation après 3 secondes (mock)
    setTimeout(() => {
      user.kyc_status = "verified";
      user.verified = true;
      notify(user.id, "kyc_verified", "Coordonnées vérifiées", "Votre email et votre téléphone sont maintenant vérifiés.");
    }, 3000);
    return json(res, { status: "pending", message: "Vérification en cours, sous 3 secondes (mock)." });
  }

  if (path === "/api/kyc/status" && method === "GET") {
    const user = requireUser(req, res);
    if (!user) return;
    return json(res, { status: user.kyc_status || "none", verified: !!user.verified });
  }

  // Calendrier de disponibilité
  if (path.match(/^\/api\/listings\/[\w-]+\/availability$/) && method === "GET") {
    const id = path.split("/")[3];
    const listing = LISTINGS.find((l) => l.id === id);
    if (!listing) return json(res, { detail: "Not found" }, 404);
    const blocked = listing.blocked_dates || [];
    // Récupère aussi les bookings actifs comme dates bloquées
    const activeBookings = BOOKINGS.filter(
      (b) => b.listing_id === id && ACTIVE_BOOKING_STATUSES.has(b.status)
    );
    const bookingDates = [];
    for (const b of activeBookings) {
      const start = new Date(b.start_date);
      const end = new Date(b.end_date);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        bookingDates.push(d.toISOString().slice(0, 10));
      }
    }
    return json(res, {
      blocked_dates: blocked,
      booked_dates: bookingDates,
    });
  }

  if (path.match(/^\/api\/listings\/[\w-]+\/availability$/) && method === "PATCH") {
    const id = path.split("/")[3];
    const body = await parseBody(req);
    const listing = LISTINGS.find((l) => l.id === id);
    if (!listing) return json(res, { detail: "Not found" }, 404);
    listing.blocked_dates = Array.isArray(body.blocked_dates) ? body.blocked_dates : [];
    return json(res, { ok: true, blocked_dates: listing.blocked_dates });
  }

  // Push notifications — enregistrement token
  if (path === "/api/push/register" && method === "POST") {
    const body = await parseBody(req);
    DEMO_USER.push_token = body.token || null;
    return json(res, { ok: true });
  }

  if (path === "/api/notifications" && method === "GET") {
    const items = NOTIFICATIONS.filter((n) => n.user_id === DEMO_USER.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return json(res, items);
  }

  if (path.match(/^\/api\/notifications\/[\w-]+\/read$/) && method === "POST") {
    const id = path.split("/")[3];
    const n = NOTIFICATIONS.find((x) => x.id === id);
    if (n) n.read = true;
    return json(res, { ok: true });
  }

  if (path === "/api/notifications/read-all" && method === "POST") {
    NOTIFICATIONS.forEach((n) => { if (n.user_id === DEMO_USER.id) n.read = true; });
    return json(res, { ok: true });
  }

  // ═══════════════════════════════════════════════
  //  PHASE 4 — Système de parrainage
  // ═══════════════════════════════════════════════

  // Mon code + mes filleuls + mon crédit
  if (path === "/api/referral/me" && method === "GET") {
    const me = DEMO_USER;
    const referrals = Object.values(USERS).filter((u) => u.referred_by === me.referral_code);
    return json(res, {
      referral_code: me.referral_code,
      credit_balance: me.credit_balance || 0,
      referrals: referrals.map((r) => ({
        id: r.id, name: r.name, joined_at: r.created_at,
        has_booked: BOOKINGS.some((b) => b.user_id === r.id && b.status === "paid"),
      })),
      reward_amount: 10,
    });
  }

  // Vérifier un code de parrainage avant inscription
  if (path === "/api/referral/check" && method === "POST") {
    const body = await parseBody(req);
    const code = (body.code || "").toUpperCase();
    const sponsor = Object.values(USERS).find((u) => u.referral_code === code);
    if (!sponsor) return json(res, { valid: false, message: "Code invalide" }, 404);
    return json(res, { valid: true, sponsor_name: sponsor.name, reward: 10 });
  }

  // Hook : quand une booking passe à "paid" la 1ère fois pour un filleul,
  // on peut récompenser à nouveau (en mock, on ne fait rien de plus que le crédit initial)

  // ─── NOTIFY hooks (déclenchement après actions clés) ───
  // On instrumente certaines mutations existantes :
  //   - POST /api/bookings → notif owner "Nouvelle demande"
  //   - PATCH /api/bookings/:id → notif renter "Demande acceptée/refusée"
  //   - POST /api/messages → notif destinataire "Nouveau message"
  // → géré directement dans les handlers ci-dessus via post-processing :
  // (Note : pour simplicité on les notifie depuis ici via NOTIFICATIONS history)

  // ═══════════════════════════════════════════════
  //  PHASE 5 — Signalements & Trust/Safety
  // ═══════════════════════════════════════════════

  // POST /api/reports → créer un signalement
  // target_type: "listing" | "user" | "message"
  // target_id: string
  // category: "scam" | "inappropriate" | "illegal" | "spam" | "fake" | "harassment" | "other"
  // reason: string (libre, optionnel mais recommandé)
  if (path === "/api/reports" && method === "POST") {
    const body = await parseBody(req);
    const validTargets = ["listing", "user", "message", "review"];
    const validCategories = ["scam", "inappropriate", "illegal", "spam", "fake", "harassment", "other"];
    if (!validTargets.includes(body.target_type)) {
      return json(res, { detail: "Type de cible invalide" }, 400);
    }
    if (!validCategories.includes(body.category)) {
      return json(res, { detail: "Catégorie invalide" }, 400);
    }
    if (!body.target_id) return json(res, { detail: "target_id requis" }, 400);

    // Filtre le motif libre aussi
    const reasonCheck = checkContent(body.reason || "");

    const report = {
      id: "rep_" + Date.now(),
      reporter_id: DEMO_USER.id,
      target_type: body.target_type,
      target_id: body.target_id,
      category: body.category,
      reason: body.reason || "",
      status: "pending", // pending | reviewing | resolved | dismissed
      created_at: new Date().toISOString(),
      reason_flagged: reasonCheck.flagged || reasonCheck.blocked,
    };
    REPORTS.push(report);

    // Auto-flag : si 3+ signalements sur la même cible, on flag automatiquement
    const sameTargetCount = REPORTS.filter(
      (r) => r.target_type === body.target_type && r.target_id === body.target_id
    ).length;
    if (sameTargetCount >= 3) {
      if (body.target_type === "listing") {
        const l = LISTINGS.find((x) => x.id === body.target_id);
        if (l) l.flagged_for_review = true;
      } else if (body.target_type === "user") {
        const u = USERS[body.target_id];
        if (u) u.flagged_for_review = true;
      }
    }

    return json(res, {
      ok: true,
      report_id: report.id,
      message: "Signalement enregistré. Notre équipe va l'examiner sous 24h.",
      auto_flagged: sameTargetCount >= 3,
    }, 201);
  }

  // GET /api/reports/mine → mes signalements
  if (path === "/api/reports/mine" && method === "GET") {
    const mine = REPORTS.filter((r) => r.reporter_id === DEMO_USER.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return json(res, mine);
  }

  // GET /api/reports/target/{type}/{id} → nombre de signalements sur une cible
  if (path.match(/^\/api\/reports\/target\/[\w-]+\/[\w-]+$/) && method === "GET") {
    const parts = path.split("/");
    const t = parts[4], id = parts[5];
    const count = REPORTS.filter((r) => r.target_type === t && r.target_id === id).length;
    return json(res, { count });
  }

  // POST /api/content/check → vérifier du contenu avant submit (utile pour l'UI)
  if (path === "/api/content/check" && method === "POST") {
    const body = await parseBody(req);
    const result = checkContent(body.text || "");
    return json(res, result);
  }

  // ═══════════════════════════════════════════════
  //  PHASE 6 — Identification multi-méthodes
  // ═══════════════════════════════════════════════

  // ─── 1. MAGIC LINK / OTP par email ─────────────
  // POST /api/auth/otp/request → envoie un code à 6 chiffres (mock = retourne le code)
  if (path === "/api/auth/otp/request" && method === "POST") {
    const body = await parseBody(req);
    const email = (body.email || "").toLowerCase().trim();
    const phone = normalizePhone(body.phone);
    if (!email) return json(res, { detail: "Email requis" }, 400);
    if (!phone) return json(res, { detail: "Numéro de téléphone invalide" }, 400);
    const code = genOTP();
    const otpKey = `${email}|${phone}`;
    OTP_STORE.set(otpKey, {
      code,
      expires_at: Date.now() + 10 * 60 * 1000, // 10 min
      attempts: 0,
      email,
      phone,
      name: body.name || null,
    });
    console.log(`[OTP] ${email} / ${phone} → ${code}`);
    return json(res, {
      ok: true,
      message: `Code envoyé à ${email} et ${phone}. Valable 10 minutes.`,
      // En production, JAMAIS retourner le code. En mode démo on l'expose pour faciliter le test.
      _dev_code: code,
      expires_in: 600,
      delivery: { email, phone },
    });
  }

  // POST /api/auth/otp/verify → vérifie le code, crée la session
  if (path === "/api/auth/otp/verify" && method === "POST") {
    const body = await parseBody(req);
    const email = (body.email || "").toLowerCase().trim();
    const phone = normalizePhone(body.phone);
    const code = String(body.code || "").trim();
    if (!phone) return json(res, { detail: "Numéro de téléphone invalide" }, 400);
    const otpKey = `${email}|${phone}`;
    const entry = OTP_STORE.get(otpKey);
    if (!entry) return json(res, { detail: "Aucun code demandé pour ces coordonnées." }, 400);
    if (Date.now() > entry.expires_at) {
      OTP_STORE.delete(otpKey);
      return json(res, { detail: "Code expiré. Demandez-en un nouveau." }, 400);
    }
    if (entry.attempts >= 5) {
      OTP_STORE.delete(otpKey);
      return json(res, { detail: "Trop de tentatives. Demandez un nouveau code." }, 429);
    }
    if (code !== entry.code) {
      entry.attempts++;
      return json(res, { detail: "Code incorrect.", attempts_left: 5 - entry.attempts }, 401);
    }
    OTP_STORE.delete(otpKey);

    // Trouve ou crée l'utilisateur
    let user = userByEmail(email) || userByPhone(phone);
    if (!user) {
      const id = "u_otp_" + Date.now();
      user = {
        id, email, phone, name: body.name || email.split("@")[0],
        avatar: null, created_at: new Date().toISOString(),
        verified: true, kyc_status: "verified", kyc_source: "email_phone_otp",
        contact_verified_at: new Date().toISOString(),
        referral_code: "OTP" + Date.now().toString(36).slice(-4).toUpperCase(),
        referred_by: null, credit_balance: 0, push_token: null,
      };
      USERS[id] = user;
    } else {
      user.email = email;
      user.phone = phone;
      user.verified = true;
      user.kyc_status = "verified";
      user.kyc_source = "email_phone_otp";
      user.contact_verified_at = new Date().toISOString();
    }
    const token = startSession(user.id, body.device || "Web");
    return json(res, {
      access_token: token,
      user: meUser(user),
      method: "otp",
    });
  }

  // ─── Ancien parcours FranceConnect désactivé ───
  if (path === "/api/auth/franceconnect/start" && method === "POST") {
    return json(res, {
      detail: "Parcours désactivé. Utilisez /api/auth/otp/request avec email et téléphone.",
      action: "/auth/otp",
    }, 410);
  }

  if (path === "/api/auth/franceconnect/callback" && method === "POST") {
    return json(res, {
      detail: "Parcours désactivé. Utilisez /api/auth/otp/verify avec email, téléphone et code.",
      action: "/auth/otp",
    }, 410);
  }

  // ─── 3. PASSKEY / WebAuthn (biométrie) ─────────
  // POST /api/auth/passkey/register/begin → renvoie un challenge
  if (path === "/api/auth/passkey/register/begin" && method === "POST") {
    const body = await parseBody(req);
    const email = (body.email || "").toLowerCase();
    const user = userByEmail(email) || DEMO_USER;
    return json(res, {
      challenge: Buffer.from(genToken()).toString("base64"),
      rp: { name: "Toupré", id: "locashare.fr" },
      user: { id: user.id, name: user.email, displayName: user.name },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },   // ES256
        { type: "public-key", alg: -257 }, // RS256
      ],
      authenticatorSelection: { userVerification: "required", authenticatorAttachment: "platform" },
      timeout: 60000,
    });
  }

  // POST /api/auth/passkey/register/finish → enregistre la clé publique (mock)
  if (path === "/api/auth/passkey/register/finish" && method === "POST") {
    const body = await parseBody(req);
    const credId = body.credential_id || "cred_" + Date.now();
    PASSKEYS.push({
      credential_id: credId,
      user_id: body.user_id || DEMO_USER.id,
      public_key: body.public_key || "mock_pk_" + genToken(),
      device_name: body.device_name || "Cet appareil",
      created_at: new Date().toISOString(),
      last_used_at: null,
    });
    return json(res, { ok: true, credential_id: credId });
  }

  // POST /api/auth/passkey/auth/begin → challenge pour authentification
  if (path === "/api/auth/passkey/auth/begin" && method === "POST") {
    const body = await parseBody(req);
    const email = (body.email || "").toLowerCase();
    const user = userByEmail(email);
    if (!user) return json(res, { detail: "Compte introuvable" }, 404);
    const userPasskeys = PASSKEYS.filter((p) => p.user_id === user.id);
    if (userPasskeys.length === 0) {
      return json(res, { detail: "Aucune passkey enregistrée pour ce compte." }, 404);
    }
    return json(res, {
      challenge: Buffer.from(genToken()).toString("base64"),
      rpId: "locashare.fr",
      allowCredentials: userPasskeys.map((p) => ({ type: "public-key", id: p.credential_id })),
      timeout: 60000,
      userVerification: "required",
    });
  }

  // POST /api/auth/passkey/auth/finish → vérifie et crée la session
  if (path === "/api/auth/passkey/auth/finish" && method === "POST") {
    const body = await parseBody(req);
    const credId = body.credential_id;
    const passkey = PASSKEYS.find((p) => p.credential_id === credId);
    if (!passkey) return json(res, { detail: "Passkey invalide" }, 401);
    passkey.last_used_at = new Date().toISOString();
    const user = Object.values(USERS).find((u) => u.id === passkey.user_id);
    if (!user) return json(res, { detail: "Utilisateur introuvable" }, 404);
    const token = startSession(user.id, body.device_name || "Appareil avec biométrie");
    return json(res, {
      access_token: token,
      user: meUser(user),
      method: "passkey",
    });
  }

  // GET /api/auth/passkeys → mes passkeys enregistrées
  if (path === "/api/auth/passkeys" && method === "GET") {
    const mine = PASSKEYS.filter((p) => p.user_id === DEMO_USER.id);
    return json(res, mine.map((p) => ({
      credential_id: p.credential_id,
      device_name: p.device_name,
      created_at: p.created_at,
      last_used_at: p.last_used_at,
    })));
  }

  // DELETE /api/auth/passkeys/{credId} → révoque une passkey
  if (path.match(/^\/api\/auth\/passkeys\/[\w-]+$/) && method === "DELETE") {
    const credId = path.split("/").pop();
    const idx = PASSKEYS.findIndex((p) => p.credential_id === credId);
    if (idx === -1) return json(res, { detail: "Passkey introuvable" }, 404);
    PASSKEYS.splice(idx, 1);
    return json(res, { ok: true });
  }

  // ─── 4. SESSIONS ACTIVES ───────────────────────
  if (path === "/api/auth/sessions" && method === "GET") {
    const sessions = [...SESSIONS.values()]
      .filter((s) => s.user_id === DEMO_USER.id)
      .map((s) => ({
        id: s.token,
        device: s.device,
        ip: s.ip,
        created_at: s.created_at,
        last_seen: s.last_seen,
      }))
      .sort((a, b) => new Date(b.last_seen) - new Date(a.last_seen));
    return json(res, sessions);
  }

  if (path.match(/^\/api\/auth\/sessions\/[\w-]+$/) && method === "DELETE") {
    const sid = path.split("/").pop();
    SESSIONS.delete(sid);
    return json(res, { ok: true });
  }

  // ─── NOT FOUND ────────────────────────────────
  json(res, { detail: "Not found", path, method }, 404);
});

server.listen(PORT, () => {
  console.log(`\n✅ Mock Toupré API on http://localhost:${PORT}`);
  console.log(`   Demo OTP: demo@locashare.fr +33600000000`);
  console.log(`   Active: OTP email+téléphone, réservations cash, messages, avis, support\n`);
});
