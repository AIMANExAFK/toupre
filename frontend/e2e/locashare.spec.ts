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
  await page.getByPlaceholder("vous@exemple.com").fill(DEMO_EMAIL);
  await page.getByPlaceholder("06 12 34 56 78").fill(DEMO_PHONE);
  await page.getByText("Envoyer le code", { exact: true }).click();
  // En mode démo le backend renvoie le code, affiché à l'écran
  const codeEl = page.getByText(/^\d{6}$/);
  await expect(codeEl).toBeVisible();
  const code = (await codeEl.textContent())!.trim();
  const boxes = page.locator("input");
  for (let i = 0; i < 6; i++) await boxes.nth(i).fill(code[i]);
  await page.getByText("Vérifier le code", { exact: true }).click();
  await expect(page.getByText("Louer près de vous")).toBeVisible();
}

test("connexion OTP et Explorer : annonces, notes et badges", async ({ page }) => {
  // Le bouton "Commencer" de l'accueil mène directement à l'OTP (plus de hub)
  await page.goto("/");
  await page.getByText("Commencer", { exact: true }).click();
  await expect(page).toHaveURL(/\/auth\/otp/);

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
