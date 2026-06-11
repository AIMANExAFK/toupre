# Kit de diffusion Toupré — prêt à coller

> Remplace `{URL}` par l'adresse réelle du site une fois déployé (ex. `https://toupre.vercel.app`).
> Ordre conseillé : 1 déploiement → 2 QR → 3 posts Facebook → 4 campus → 5 TikTok → 6 presse.

---

## 1. Post Facebook — groupes locaux (La Garenne, Courbevoie, Colombes, Asnières...)

> Salut les voisins 👋
>
> J'ai 20 ans, je suis en BTS à côté, et je développe une appli qui permet de louer entre voisins ce qui dort dans nos garages : perceuse, vélo, voiture pour le week-end, tente, appareil photo...
>
> Le principe : 0 % de commission (les grosses applis prennent jusqu'à 20 %), on se paie en espèces à la remise, et les profils sont vérifiés. Ça s'appelle Toupré — "tout se loue, tout près".
>
> Je lance d'abord ici, dans le coin. Si l'idée vous parle, la liste d'attente est ouverte : {URL}
>
> Et si vous avez un objet qui dort et que vous seriez prêts à louer, dites-le-moi en commentaire, ça m'aide à savoir quoi ouvrir en premier 🙏

*Conseil : poste depuis ton vrai profil, réponds à chaque commentaire, et ne reposte pas le même texte mot pour mot dans chaque groupe (les groupes FB détectent le spam) — varie les premières phrases.*

## 2. Post Facebook — version propriétaires (à poster 1 semaine après)

> Question aux propriétaires du coin : vous avez une perceuse ? Un vélo cargo ? Une remorque ?
>
> En moyenne une perceuse sert 12 minutes dans toute sa vie. Pendant ce temps, quelqu'un à 400 mètres en achète une neuve.
>
> Je construis Toupré, une appli locale pour louer entre voisins, sans commission, payé en espèces à la remise. Un voisin loue votre perceuse 8 €, c'est 8 € pour vous, pas 6,40 €.
>
> Liste d'attente ici si vous voulez être prévenus à l'ouverture : {URL}

## 3. Script TikTok / Reel (30 s, face caméra)

**Hook (0-3 s)** : « J'ai 20 ans et je suis en train de coder le concurrent d'une boîte qui a levé 3 millions d'euros. »
**Corps (3-20 s)** : « Eux, ils prennent 20 % de commission quand tu loues ta perceuse à ton voisin. Moi je trouve ça absurde. Alors j'ai codé Toupré : tu loues ce que tu veux aux gens de ta ville, tu te fais payer en espèces à la remise, et je prends... zéro. Rien. C'est gratuit. »
**Preuve (20-26 s)** : *(montrer l'écran de l'app : Explorer, une annonce, le récap "À régler en espèces")*
**CTA (26-30 s)** : « Je lance dans les Hauts-de-Seine d'abord. Le lien d'attente est dans ma bio. Si ta ville doit être la prochaine, dis-le en commentaire. »

*Variantes de hook à tester : « Voilà pourquoi ta perceuse vaut 100 €/mois » · « Personne ne devrait payer 20 % pour louer à son voisin »*

## 4. Message court (WhatsApp, campus, stories)

> Je lance mon appli de location entre voisins (0 % commission, cash à la remise) — d'abord dans le 92. Inscris-toi, ça prend 10 secondes et ça m'aide énormément : {URL}

## 5. Flyer / affiche A6 (chez les commerçants partenaires)

```
   [QR CODE — docs/qr-toupre.png]

   TOUPRÉ
   Tout se loue, tout près.

   Louez la perceuse, le vélo ou la voiture
   de vos voisins. Sans commission.
   Payé en espèces, à la remise.

   Bêta ouverte dans le 92 → scannez
```

*Pour les commerçants : ressers les rapports de l'audit La Garenne-Colombes (21 prospects déjà qualifiés) — tu offres le rapport, tu demandes la vitrine.*

## 6. Pitch presse (Le Parisien 92, actu.fr, France Bleu, Maddyness)

**Objet : À 20 ans, en BTS, il lance l'alternative sans commission aux applis de location entre particuliers**

> Bonjour,
>
> Pendant que Poppins (fondée par l'équipe de Too Good To Go) lève 3 millions d'euros et prélève 20 % de commission sur les locations entre particuliers, Aïmane Ramzi, 20 ans, étudiant en BTS dans les Hauts-de-Seine, a développé seul Toupré : une appli de location entre voisins à 0 % de commission, où l'on se paie en espèces à la remise de l'objet.
>
> Le lancement se fait ville par ville, en commençant par La Garenne-Colombes. Je serais ravi de vous en dire plus ou de vous faire une démo.

*Envoyer depuis rtrident.fr@gmail.com, personnaliser le nom du journaliste, un média à la fois.*

---

## Checklist de diffusion (semaine 1)

- [ ] `cd site && vercel --prod` → noter l'URL
- [ ] `cd frontend && node scripts/make-qr.js <URL>` → QR dans docs/
- [ ] Remplacer {URL} dans ce fichier
- [ ] Post FB groupe La Garenne-Colombes (jour 1)
- [ ] Post FB 2 groupes voisins (jour 2-3, texte varié)
- [ ] Message WhatsApp promo BTS + stories (jour 2)
- [ ] Imprimer 20 flyers A6, déposer chez 5 commerçants de l'audit (jour 4-5)
- [ ] 1er TikTok (jour 6)
- [ ] Suivre les inscrits : dashboard MailerLite, groupe "Toupré — Liste d'attente"
