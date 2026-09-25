import { test, expect, Page } from "@playwright/test";

// Parcours critiques LocaShare contre le VRAI backend (FastAPI + MongoDB).
// La base est re-seedée par ../run-e2e.sh avant chaque run → état déterministe :
// demo@locashare.fr ("Alexandre D.") possède Tesla + Canon, une demande de
// Sophie M. est en attente sur la Tesla, le VTT de Sophie est notée 4.5 (2 avis).

const DEMO_EMAIL = "demo@locashare.fr";
const DEMO_PHONE = "0600000000";

// Même logique que toLocalISODate côté app : date locale, sans dérive UTC.
function localISODate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

async function loginDemo(page: Page) {
  await page.goto("/auth/otp");
  await page.getByTestId("otp-email-input").fill(DEMO_EMAIL);
  await page.getByTestId("otp-phone-input").fill(DEMO_PHONE);
  await page.getByTestId("otp-send-btn").click();
  // L'envoi passe par SMTP et prend ~1,7 s : on attend explicitement le code,
  // sinon la suite part trop tôt et le test devient instable.
  const codeEl = page.getByText(/^\d{6}$/);
  await expect(codeEl).toBeVisible({ timeout: 20_000 });
  const code = (await codeEl.textContent())!.trim();
  for (let i = 0; i < 6; i++) await page.getByTestId(`otp-digit-${i}`).fill(code[i]);
  // Le bouton ne s'active qu'une fois les 6 chiffres saisis
  await expect(page.getByTestId("otp-verify-btn")).not.toHaveAttribute("aria-disabled", "true");
  await page.getByTestId("otp-verify-btn").click();
  await expect(page.getByText("Louer près de vous")).toBeVisible({ timeout: 15_000 });
}

test("connexion OTP et Explorer : annonces, notes et badges", async ({ page }) => {
  // Comme dans Slate, l'app s'ouvre directement sur le splash puis la connexion
  await page.goto("/");
  await expect(page).toHaveURL(/\/auth\/otp/, { timeout: 15_000 });

  await loginDemo(page);

  // Les 8 annonces seedées avec leurs propriétaires
  await expect(page.getByText("VTT électrique Trek")).toBeVisible();
  await expect(page.getByText("Tesla Model 3 - Berline électrique")).toBeVisible();
  // La note agrégée remonte du backend (rating + count)
  await expect(page.getByText("4.5 · 2 avis")).toBeVisible();
  // Le compte démo voit ses propres annonces marquées
  await expect(page.getByText("Votre annonce").first()).toBeVisible();
  // Propriétaires tiers visibles
  await expect(page.getByText("Sophie M.").first()).toBeVisible();
});

test("réservation : les dates envoyées sont les dates locales choisies", async ({ page }) => {
  await loginDemo(page);

  // Ouvre une annonce qui n'appartient PAS au compte démo
  await page.getByText("VTT électrique Trek").first().click();
  await expect(page).toHaveURL(/\/listing\//);
  // Les onglets RN-web gardent les écrans montés : filtrer sur le bouton visible
  await page.getByText("Réserver", { exact: true }).filter({ visible: true }).first().click();
  await expect(page).toHaveURL(/\/booking\//);
  // Tant qu'aucune date n'est choisie, le récapitulatif n'affiche pas un total
  // à 0,00€ : il invite à choisir les dates.
  await expect(page.getByTestId("recap-vide")).toBeVisible();
  await expect(page.getByText("À régler en espèces")).toHaveCount(0);

  // Plus aucune date n'est présélectionnée : on choisit J+1 puis J+2 dans le
  // calendrier. Deux clics distincts, l'état React devant se propager entre eux.
  await expect(page.getByTestId("reserve-btn")).toBeDisabled();
  await page.getByTestId(`cal-${localISODate(1)}`).click();
  await page.getByTestId(`cal-${localISODate(2)}`).click();
  await expect(page.getByTestId("cal-resume")).toContainText("2 jours");
  // Les dates posées, le montant à régler apparaît.
  await expect(page.getByText("À régler en espèces")).toBeVisible();

  // Régression bug fuseau horaire : le POST doit porter la date LOCALE (J+1),
  // pas la veille en UTC (l'ancien toISOString() reculait d'un jour après minuit UTC)
  const [request] = await Promise.all([
    page.waitForRequest((r) => r.url().includes("/api/bookings") && r.method() === "POST"),
    page.getByText("Demander la réservation").click(),
  ]);
  const payload = JSON.parse(request.postData() || "{}");
  expect(payload.start_date).toBe(localISODate(1));
  expect(payload.end_date).toBe(localISODate(2));

  // La réservation apparaît côté locataire, en attente
  await expect(page).toHaveURL(/\/bookings/);
  await expect(page.getByText("En attente").first()).toBeVisible();
});

test("propriétaire : accepter une demande, profil cohérent, carte vérifiée", async ({ page }) => {
  await loginDemo(page);

  // La demande seedée de Sophie sur la Tesla (267€)
  await page.getByRole("tab", { name: /Mes biens/ }).click();
  await page.getByText("Demandes", { exact: true }).click();
  await expect(page.getByText("En attente").first()).toBeVisible();
  await expect(page.getByText("267€")).toBeVisible();
  await page.getByText("Accepter").click();
  await expect(page.getByText("Acceptée")).toBeVisible();

  // Profil : stats réelles + carte de vérification à l'état vérifié
  await page.getByRole("tab", { name: /Profil/ }).click();
  await expect(page.getByText("Email et téléphone vérifiés")).toBeVisible();
  await expect(page.getByText("Annonces", { exact: true })).toBeVisible();
  await expect(page.getByText("5.0", { exact: true }).first()).toBeVisible();

  // La carte vérifiée mène à la page Sécurité (et ne relance plus l'OTP)
  await page.getByText("Email et téléphone vérifiés").click();
  await expect(page).toHaveURL(/\/security/);
});

// ─── Spec 001 : état des lieux photo ────────────────────────────────────────
// L'état est monté par API (rapide et déterministe), le comportement vérifié dans l'UI.

const API = "http://localhost:8000/api";

async function apiLogin(request: any, email: string, phone: string) {
  const r1 = await request.post(`${API}/auth/otp/request`, { data: { email, phone } });
  const code = (await r1.json())._dev_code;
  const r2 = await request.post(`${API}/auth/otp/verify`, { data: { email, phone, code } });
  return r2.json();
}

/** Crée une réservation confirmée sur une annonce du compte démo et connecte le locataire. */
// Fenêtre de dates tirée au hasard loin dans le futur : les tests restent
// indépendants de l'état de la base (réservations laissées par un run précédent).
function fenetreLibre() {
  return 120 + Math.floor(Math.random() * 600);
}

async function bookingConfirme(page: Page, request: any, renterEmail: string, renterPhone: string) {
  const jour = fenetreLibre();
  const owner = await apiLogin(request, DEMO_EMAIL, DEMO_PHONE);
  const renter = await apiLogin(request, renterEmail, renterPhone);
  const listings = await (await request.get(`${API}/listings`)).json();
  const target = listings.find((l: any) => l.owner_id === owner.user.id);
  const booking = await (await request.post(`${API}/bookings`, {
    data: { listing_id: target.id, start_date: localISODate(jour), end_date: localISODate(jour + 1) },
    headers: { Authorization: `Bearer ${renter.access_token}` },
  })).json();
  // Échoue tôt et clairement si la mise en scène n'a pas abouti
  expect(booking.id, `réservation non créée : ${JSON.stringify(booking)}`).toBeTruthy();
  await request.patch(`${API}/bookings/${booking.id}`, {
    data: { status: "confirmed" },
    headers: { Authorization: `Bearer ${owner.access_token}` },
  });
  await page.goto("/");
  await page.evaluate(({ t, u }) => {
    localStorage.setItem("ls_mock_token", t);
    localStorage.setItem("ls_mock_user", JSON.stringify(u));
  }, { t: renter.access_token, u: renter.user });
  return booking.id;
}

/** Fournit une vraie image au sélecteur ouvert par expo-image-picker. */
async function ajouterPhoto(page: Page) {
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByTestId("add-photo").click(),
  ]);
  await chooser.setFiles({
    name: "constat.jpg",
    mimeType: "image/jpeg",
    // JPEG 1×1 minimal
    buffer: Buffer.from(
      "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
      "base64",
    ),
  });
  await expect(page.getByText("1/5")).toBeVisible();
}

test("constat de remise : impossible de démarrer sans photo", async ({ page, request }) => {
  const id = await bookingConfirme(page, request, "e2e-remise@test.fr", "0788990011");
  await page.goto(`/booking/constat?id=${id}&kind=pickup`);

  // Sans photo : le bouton dit ce qui manque et refuse la validation
  const submit = page.getByTestId("constat-submit");
  await expect(submit).toBeVisible();
  await expect(page.getByText("Ajoutez au moins une photo")).toBeVisible();
  await expect(page.getByText("définitif et visible par l'autre partie")).toBeVisible();

  await ajouterPhoto(page);
  await expect(page.getByText("Valider la remise")).toBeVisible();
  await submit.click();

  // Retour à la liste, location passée en cours
  await expect(page).toHaveURL(/\/bookings/);
  await expect(page.getByText("En cours").first()).toBeVisible();
});

test("constat de retour : une explication est exigée si un problème est signalé", async ({ page, request }) => {
  const id = await bookingConfirme(page, request, "e2e-retour@test.fr", "0788990022");
  // remise faite via l'UI pour arriver à l'état « en cours »
  await page.goto(`/booking/constat?id=${id}&kind=pickup`);
  await ajouterPhoto(page);
  await page.getByTestId("constat-submit").click();
  await expect(page).toHaveURL(/\/bookings/);

  await page.goto(`/booking/constat?id=${id}&kind=return`);
  await ajouterPhoto(page);
  await page.getByTestId("condition-damaged").click();

  // Photo présente mais explication manquante → validation refusée, libellé explicite
  await expect(page.getByText("Ajoutez une explication")).toBeVisible();
  // React Native Web rend TouchableOpacity en <div aria-disabled>, pas en <button disabled>
  await expect(page.getByTestId("constat-submit")).toHaveAttribute("aria-disabled", "true");

  await page.getByTestId("constat-notes").fill("Rayure neuve sur le boîtier.");
  await expect(page.getByText("Valider le retour")).toBeVisible();
  await page.getByTestId("constat-submit").click();

  // Le litige est tracé
  await expect(page).toHaveURL(/\/bookings/);
  await expect(page.getByText("Litige").first()).toBeVisible();
});

test("consultation partagée : le propriétaire voit le constat du locataire et peut le compléter", async ({ page, request }) => {
  const owner = await apiLogin(request, DEMO_EMAIL, DEMO_PHONE);
  const renter = await apiLogin(request, "e2e-vue@test.fr", "0788990033");
  const listings = await (await request.get(`${API}/listings`)).json();
  const target = listings.find((l: any) => l.owner_id === owner.user.id);
  const jour = fenetreLibre();
  const booking = await (await request.post(`${API}/bookings`, {
    data: { listing_id: target.id, start_date: localISODate(jour), end_date: localISODate(jour + 1) },
    headers: { Authorization: `Bearer ${renter.access_token}` },
  })).json();
  expect(booking.id, `réservation non créée : ${JSON.stringify(booking)}`).toBeTruthy();
  await request.patch(`${API}/bookings/${booking.id}`, {
    data: { status: "confirmed" },
    headers: { Authorization: `Bearer ${owner.access_token}` },
  });
  // Le locataire dépose son constat de remise
  const posted = await request.post(`${API}/bookings/${booking.id}/inspection`, {
    data: {
      kind: "pickup", condition: "ok", notes: "Boîtier nickel, sangle incluse.",
      photos: ["data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//2wBDAf//wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="],
    },
    headers: { Authorization: `Bearer ${renter.access_token}` },
  });
  expect(posted.status()).toBe(200);

  // Le PROPRIÉTAIRE consulte : symétrie exigée par le principe I
  await page.goto("/");
  await page.evaluate(({ t, u }) => {
    localStorage.setItem("ls_mock_token", t);
    localStorage.setItem("ls_mock_user", JSON.stringify(u));
  }, { t: owner.access_token, u: owner.user });
  await page.goto(`/booking/constats?id=${booking.id}`);

  await expect(page.getByText("Ces constats sont définitifs et visibles par les deux parties.")).toBeVisible();
  await expect(page.getByTestId("inspection-pickup")).toBeVisible();
  await expect(page.getByText("Boîtier nickel, sangle incluse.")).toBeVisible();
  // Attribution nominative (FR-005)
  await expect(page.getByText(/locataire/)).toBeVisible();
  // Et il peut ajouter sa propre observation sans écraser celle du locataire
  await expect(page.getByTestId("add-counter-pickup")).toBeVisible();
});

// ─── Spec 002 : accessibilité (non-régression) ──────────────────────────────

test("accessibilité : tout élément actionnable a un rôle et un nom", async ({ page }) => {
  await loginDemo(page);
  // Les annonces arrivent après l'écran : sans cette attente, la mesure porte
  // sur une page à moitié rendue et le compte varie d'un run à l'autre.
  await expect(page.getByTestId(/^rental-card-/).first()).toBeVisible({ timeout: 15_000 });

  const bilan = await page.evaluate(() => {
    const root = document.getElementById("root")!;
    const sel = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const parcours = [...root.querySelectorAll(sel)];
    const champs = ["INPUT", "TEXTAREA", "SELECT"];
    const nom = (e: Element) =>
      e.getAttribute("aria-label") || (e.textContent || "").trim();
    return {
      arrets: parcours.length,
      // Un <div> focusable sans rôle est muet pour un lecteur d'écran
      divsNus: parcours.filter(
        (e) => !["A", "BUTTON", "INPUT", "TEXTAREA", "SELECT"].includes(e.tagName) && !e.getAttribute("role"),
      ).length,
      sansNom: parcours.filter((e) => !nom(e) && !champs.includes(e.tagName)).length,
      imagesSansAlt: [...root.querySelectorAll("img")].filter((i) => i.getAttribute("alt") === null).length,
    };
  });

  expect(bilan.arrets, "écran trop pauvre pour que la mesure ait un sens").toBeGreaterThan(10);
  expect(bilan.divsNus, "éléments focusables sans rôle accessible").toBe(0);
  expect(bilan.sansNom, "éléments actionnables sans nom accessible").toBe(0);
  expect(bilan.imagesSansAlt, "images sans alternative textuelle").toBe(0);
});

test("accessibilité : le focus clavier est visible", async ({ page }) => {
  await loginDemo(page);
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");

  const focus = await page.evaluate(() => {
    const a = document.activeElement!;
    const cs = getComputedStyle(a);
    return {
      balise: a.tagName,
      contourVisible: cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0,
    };
  });
  // La règle projet supprime les halos à la souris ; :focus-visible les rétablit au clavier
  expect(focus.balise).not.toBe("BODY");
  expect(focus.contourVisible, "focus clavier invisible : l'app est inutilisable sans souris").toBe(true);
});

// ─── Spec 004 : dépôt d'un avis ─────────────────────────────────────────────

test("avis : une location terminée peut être notée et la note de l'annonce évolue", async ({ page, request }) => {
  const owner = await apiLogin(request, DEMO_EMAIL, DEMO_PHONE);
  const renter = await apiLogin(request, "e2e-avis@test.fr", "0788990044");
  const listings = await (await request.get(`${API}/listings`)).json();
  const cible = listings.find((l: any) => l.owner_id === owner.user.id);
  const noteAvant = cible.rating;
  const nbAvant = cible.count;

  // Location menée jusqu'à son terme, par API pour rester rapide et déterministe
  const jour = fenetreLibre();
  const booking = await (await request.post(`${API}/bookings`, {
    data: { listing_id: cible.id, start_date: localISODate(jour), end_date: localISODate(jour + 1) },
    headers: { Authorization: `Bearer ${renter.access_token}` },
  })).json();
  expect(booking.id, `réservation non créée : ${JSON.stringify(booking)}`).toBeTruthy();
  await request.patch(`${API}/bookings/${booking.id}`, {
    data: { status: "confirmed" },
    headers: { Authorization: `Bearer ${owner.access_token}` },
  });
  const photo = "data:image/jpeg;base64," + "A".repeat(400);
  for (const kind of ["pickup", "return"]) {
    await request.post(`${API}/bookings/${booking.id}/inspection`, {
      data: { kind, condition: "ok", notes: "RAS", photos: [photo] },
      headers: { Authorization: `Bearer ${renter.access_token}` },
    });
  }

  await page.goto("/");
  await page.evaluate(({ t, u }) => {
    localStorage.setItem("ls_mock_token", t);
    localStorage.setItem("ls_mock_user", JSON.stringify(u));
  }, { t: renter.access_token, u: renter.user });

  await page.goto(`/booking/avis?listingId=${cible.id}&titre=${encodeURIComponent(cible.title)}`);

  // Sans note choisie, la validation est impossible et le bouton dit pourquoi
  await expect(page.getByText("Choisissez une note").first()).toBeVisible();
  await expect(page.getByTestId("avis-submit")).toHaveAttribute("aria-disabled", "true");

  await page.getByTestId("avis-etoile-4").click();
  await expect(page.getByText("Très bien")).toBeVisible();
  await page.getByTestId("avis-commentaire").fill("Matériel conforme, remise rapide.");
  await page.getByTestId("avis-submit").click();
  await expect(page).toHaveURL(/\/bookings/);

  // SC-002 : la note de l'annonce a bougé
  const apres = (await (await request.get(`${API}/listings`)).json()).find((l: any) => l.id === cible.id);
  expect(apres.count, "le nombre d'avis n'a pas augmenté").toBe((nbAvant ?? 0) + 1);
  expect(apres.rating).not.toBe(noteAvant);
});

// ─── Spec 005 : trouver un objet, gérer son annonce ─────────────────────────

/** Pose la session d'un compte sans repasser par l'écran OTP. */
async function poserSession(page: Page, compte: any) {
  await page.goto("/");
  await page.evaluate(({ t, u }) => {
    localStorage.setItem("ls_mock_token", t);
    localStorage.setItem("ls_mock_user", JSON.stringify(u));
  }, { t: compte.access_token, u: compte.user });
}

test("recherche : un mot présent uniquement dans la description remonte l'annonce", async ({ page, request }) => {
  await poserSession(page, await apiLogin(request, DEMO_EMAIL, DEMO_PHONE));
  await page.goto("/");
  await expect(page.getByTestId("explore-title")).toBeVisible({ timeout: 15_000 });

  // « mariage » n'apparaît dans aucun titre : seule une recherche côté serveur,
  // portant sur la description, peut trouver le Canon.
  await page.getByTestId("search-input").fill("mariage");
  await expect(page.getByText("Canon EOS R6 + Objectif 24-70mm")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Tesla Model 3 - Berline électrique")).toHaveCount(0);

  // Les accents ne doivent pas faire échouer la recherche
  await page.getByTestId("search-input").fill("electrique");
  await expect(page.getByText("Tesla Model 3 - Berline électrique")).toBeVisible({ timeout: 10_000 });

  // Un filtre de prix restreint bien le résultat
  await page.getByTestId("search-input").fill("");
  await page.getByTestId("filtres-btn").click();
  await page.getByTestId("prix-15").click();
  await expect(page.getByText("Tesla Model 3 - Berline électrique")).toHaveCount(0);
  await expect(page.getByText("Perceuse Bosch sans fil 18V")).toBeVisible({ timeout: 10_000 });
});

test("calendrier : un jour réservé n'est pas sélectionnable par un autre locataire", async ({ page, request }) => {
  const owner = await apiLogin(request, DEMO_EMAIL, DEMO_PHONE);
  const premier = await apiLogin(request, "e2e-cal1@test.fr", "0788990055");
  const second = await apiLogin(request, "e2e-cal2@test.fr", "0788990066");
  const listings = await (await request.get(`${API}/listings`)).json();
  const cible = listings.find((l: any) => l.owner_id === owner.user.id);

  // Date proche et fixe : le calendrier ne va pas au-delà de 12 mois, et aucun
  // autre test ne réserve dans cette fenêtre (la base est purgée à chaque run).
  const jour = 45;
  const debut = localISODate(jour);
  const booking = await (await request.post(`${API}/bookings`, {
    data: { listing_id: cible.id, start_date: debut, end_date: localISODate(jour + 1) },
    headers: { Authorization: `Bearer ${premier.access_token}` },
  })).json();
  expect(booking.id, `réservation non créée : ${JSON.stringify(booking)}`).toBeTruthy();
  await request.patch(`${API}/bookings/${booking.id}`, {
    data: { status: "confirmed" },
    headers: { Authorization: `Bearer ${owner.access_token}` },
  });

  await poserSession(page, second);
  await page.goto(`/booking/${cible.id}`);
  await expect(page.getByTestId("calendrier")).toBeVisible({ timeout: 10_000 });

  // Le calendrier ouvre sur le mois courant : on avance jusqu'au mois de la
  // réservation (la fenêtre de test est tirée loin dans le futur).
  const casePrise = page.getByTestId(`cal-${debut}`);
  for (let i = 0; i < 26 && (await casePrise.count()) === 0; i++) {
    await page.getByTestId("cal-next").click();
  }

  // Le jour pris est annoncé indisponible et refuse le clic : l'erreur est
  // rendue impossible au lieu d'être signalée après coup.
  await expect(casePrise).toBeDisabled();
  await expect(casePrise).toHaveAttribute("aria-label", /indisponible/);

  // Tant qu'aucune date n'est choisie, on ne peut pas demander la réservation
  await expect(page.getByTestId("reserve-btn")).toBeDisabled();
});

test("annonce : le propriétaire modifie son prix sans perdre ses avis", async ({ page, request }) => {
  const owner = await apiLogin(request, DEMO_EMAIL, DEMO_PHONE);
  const listings = await (await request.get(`${API}/listings`)).json();
  const cible = listings.find((l: any) => l.owner_id === owner.user.id && l.count > 0)
    || listings.find((l: any) => l.owner_id === owner.user.id);
  const avisAvant = cible.count;
  const nouveauPrix = String(Math.round(cible.price_per_day) + 7);

  await poserSession(page, owner);
  await page.goto(`/listing/edit?id=${cible.id}`);
  await expect(page.getByTestId("edit-titre")).toHaveValue(cible.title, { timeout: 10_000 });
  // Sans changement, la validation reste fermée
  await expect(page.getByTestId("edit-submit")).toBeDisabled();

  await page.getByTestId("edit-prix").fill(nouveauPrix);
  await expect(page.getByTestId("edit-submit")).toBeEnabled();
  await page.getByTestId("edit-submit").click();

  await expect(page).toHaveURL(/myitems/, { timeout: 10_000 });
  const apres = await (await request.get(`${API}/listings/${cible.id}`)).json();
  expect(apres.price_per_day).toBe(Number(nouveauPrix));

  const avis = await (await request.get(`${API}/reviews/listing/${cible.id}`)).json();
  expect(avis.count, "les avis doivent survivre à une modification").toBe(avisAvant);
});

test("modération : une annonce interdite est refusée, un outil au nom ambigu passe", async ({ request }) => {
  const owner = await apiLogin(request, DEMO_EMAIL, DEMO_PHONE);
  const entetes = { Authorization: `Bearer ${owner.access_token}` };
  const base = {
    category: "tool", price_per_day: 9,
    photos: ["https://images.pexels.com/photos/3877525/pexels-photo-3877525.jpeg"],
    location: { lat: 48.9, lng: 2.4, address: "Bobigny" },
  };

  const refus = await request.post(`${API}/listings`, {
    data: { ...base, title: "Pistolet 9mm", description: "Bon état, peu servi." },
    headers: entetes,
  });
  expect(refus.status()).toBe(400);

  // Le filtre ne doit pas écarter un outil parfaitement louable
  const accepte = await request.post(`${API}/listings`, {
    data: { ...base, title: "Pistolet à peinture Wagner", description: "Pour repeindre un mur." },
    headers: entetes,
  });
  expect(accepte.status()).toBe(200);
  await request.delete(`${API}/listings/${(await accepte.json()).id}`, { headers: entetes });

  const voisin = await apiLogin(request, "e2e-moderation@test.fr", "0788990077");
  const message = await request.post(`${API}/messages`, {
    data: { to_id: owner.user.id, content: "On fait le paiement direct hors plateforme ?" },
    headers: { Authorization: `Bearer ${voisin.access_token}` },
  });
  expect(message.status()).toBe(400);

  const normal = await request.post(`${API}/messages`, {
    data: { to_id: owner.user.id, content: "Bonjour, l'objet est-il libre samedi ?" },
    headers: { Authorization: `Bearer ${voisin.access_token}` },
  });
  expect(normal.status()).toBe(200);
});

// ─── Poids des images ───────────────────────────────────────────────────────

test("images : aucune photo n'est servie en pleine résolution", async ({ page }) => {
  await poserSession(page, await apiLogin(page.request, DEMO_EMAIL, DEMO_PHONE));
  await page.goto("/");
  await expect(page.getByTestId(/^rental-card-/).first()).toBeVisible({ timeout: 15_000 });

  // Les photothèques servent l'original — jusqu'à 4,5 Mo pour une vignette.
  // Chaque photo distante doit porter une consigne de redimensionnement.
  const brutes = await page.evaluate(() =>
    [...document.querySelectorAll("img")]
      .map((i) => i.src)
      .filter((s) => /^https?:/.test(s) && !/[?&]w=\d+/.test(s)),
  );
  expect(brutes, `photos servies en pleine résolution : ${brutes.join(", ")}`).toEqual([]);

  // Et la consigne doit rester raisonnable : au-delà, l'œil ne gagne rien.
  const trop = await page.evaluate(() =>
    [...document.querySelectorAll("img")]
      .map((i) => Number((i.src.match(/[?&]w=(\d+)/) || [])[1] || 0))
      .filter((w) => w > 1400),
  );
  expect(trop, "redimensionnement demandé trop généreux").toEqual([]);
});

test("catalogue : chaque annonce a sa propre photo", async ({ request }) => {
  const annonces = await (await request.get(`${API}/listings`)).json();
  const photos = annonces.map((a: any) => a.photos[0]);
  const doublons = photos.filter((p: string, i: number) => photos.indexOf(p) !== i);
  // Deux annonces qui partagent une photo font douter de tout le catalogue.
  expect(doublons, `photos partagées par plusieurs annonces : ${doublons.join(", ")}`).toEqual([]);
});

// ─── Honnêteté des états ────────────────────────────────────────────────────

test("panne réseau : l'app dit la vérité et propose de réessayer", async ({ page, request }) => {
  await poserSession(page, await apiLogin(request, DEMO_EMAIL, DEMO_PHONE));

  // Serveur injoignable : l'écran annonçait « Aucun résultat » et conseillait
  // de changer de recherche — un remède qui ne pouvait pas marcher.
  await page.route("**/api/listings**", (route) => route.abort("failed"));
  await page.goto("/");
  await expect(page.getByTestId("explore-panne")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Annonces indisponibles")).toBeVisible();
  await expect(page.getByText("Aucun résultat")).toHaveCount(0);

  // Le réseau revient : le bouton doit vraiment rattraper la situation.
  await page.unroute("**/api/listings**");
  await page.getByTestId("explore-reessayer").click();
  await expect(page.getByTestId(/^rental-card-/).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("explore-panne")).toHaveCount(0);
});

test("petit écran : aucun texte n'est amputé sur 320 points", async ({ page, request }) => {
  await poserSession(page, await apiLogin(request, DEMO_EMAIL, DEMO_PHONE));
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/");
  await expect(page.getByTestId(/^rental-card-/).first()).toBeVisible({ timeout: 15_000 });

  // 320 points, c'est l'iPhone SE et les petits Android : encore utilisés.
  const coupes = await page.evaluate(() =>
    [...document.querySelectorAll("#root div, #root span")]
      .filter((e) => {
        const t = (e as HTMLElement).innerText || "";
        return t.length > 0 && t.length < 40 && !t.includes("\n")
          && e.children.length === 0 && e.scrollWidth > e.clientWidth + 1;
      })
      .map((e) => (e as HTMLElement).innerText),
  );
  expect(coupes, `textes amputés sur un écran étroit : ${coupes.join(" | ")}`).toEqual([]);
});

// ─── Plusieurs photos par annonce ───────────────────────────────────────────

test("galerie : une annonce à plusieurs photos se parcourt, une seule reste simple", async ({ page, request }) => {
  await poserSession(page, await apiLogin(request, DEMO_EMAIL, DEMO_PHONE));
  const annonces = await (await request.get(`${API}/listings`)).json();
  const plusieurs = annonces.find((a: any) => a.photos.length > 1);
  const seule = annonces.find((a: any) => a.photos.length === 1);
  expect(plusieurs, "le jeu de démonstration doit contenir une annonce à plusieurs photos").toBeTruthy();

  await page.goto(`/listing/${plusieurs.id}`);
  await expect(page.getByTestId("galerie")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("galerie-compteur")).toContainText(`1 / ${plusieurs.photos.length}`);

  // Sauter à la dernière photo doit vraiment déplacer la galerie
  const dernier = plusieurs.photos.length - 1;
  await page.getByTestId(`galerie-point-${dernier}`).click();
  await expect(page.getByTestId("galerie-compteur")).toContainText(`${dernier + 1} / ${plusieurs.photos.length}`);

  // Une seule photo : ni compteur ni pastilles, ce serait du bruit
  await page.goto(`/listing/${seule.id}`);
  await expect(page.getByTestId("listing-detail-screen")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("galerie")).toHaveCount(0);
});

test("annonce : le nombre et le poids des photos sont bornés côté serveur", async ({ request }) => {
  const owner = await apiLogin(request, DEMO_EMAIL, DEMO_PHONE);
  const entetes = { Authorization: `Bearer ${owner.access_token}` };
  const photo = "https://images.pexels.com/photos/3877525/pexels-photo-3877525.jpeg";
  const base = {
    title: "Escabeau 3 marches", description: "Aluminium, léger, stable et pliable.",
    category: "tool", price_per_day: 5,
    location: { lat: 48.9, lng: 2.4, address: "Bobigny" },
  };

  // Une annonce sans photo n'est pas consultable : autant la refuser à la source.
  expect((await request.post(`${API}/listings`, { data: { ...base, photos: [] }, headers: entetes })).status()).toBe(400);
  expect((await request.post(`${API}/listings`, { data: { ...base, photos: Array(6).fill(photo) }, headers: entetes })).status()).toBe(400);

  const ok = await request.post(`${API}/listings`, { data: { ...base, photos: Array(5).fill(photo) }, headers: entetes });
  expect(ok.status()).toBe(200);
  const cree = await ok.json();
  expect(cree.photos).toHaveLength(5);

  // La borne vaut aussi à la modification, sinon elle se contourne
  const debord = await request.patch(`${API}/listings/${cree.id}`, {
    data: { photos: Array(6).fill(photo) }, headers: entetes,
  });
  expect(debord.status()).toBe(400);
  await request.delete(`${API}/listings/${cree.id}`, { headers: entetes });
});
