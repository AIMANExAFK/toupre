# Feature Specification: État des lieux photo à la remise et au retour

**Feature Branch**: `001-etat-des-lieux-photo`

**Created**: 2026-08-17

**Status**: Draft

**Input**: User description: "L'état des lieux photo est la parade principale au risque n°1 du produit (litiges sans paiement séquestré, identifié dans le business plan). La capacité existe côté serveur mais l'application n'envoie qu'une coquille vide : aucune photo, état forcé à « ok », aucune consultation possible. Il faut en faire une vraie preuve partagée entre les deux parties."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Le locataire documente l'objet à la remise (Priority: P1)

Au moment de récupérer l'objet, en présence du propriétaire, le locataire ouvre sa réservation et
confirme la remise. Avant de valider, il prend une ou plusieurs photos de l'objet dans son état
actuel et peut ajouter une note libre (« rayure sur le côté droit déjà présente »). La confirmation
n'est possible qu'une fois au moins une photo prise.

**Why this priority**: C'est la moitié indispensable de la preuve. Sans état initial documenté,
aucun litige ultérieur n'est arbitrable, et la promesse « en confiance » du produit est creuse.
Livrée seule, cette histoire apporte déjà de la valeur : le propriétaire sait que l'objet part
photographié.

**Independent Test**: Réserver un objet, accepter la demande, puis confirmer la remise côté
locataire : la validation doit être impossible sans photo, et l'état des lieux enregistré doit
contenir la photo et la note saisies.

**Acceptance Scenarios**:

1. **Given** une réservation acceptée, **When** le locataire ouvre la confirmation de remise, **Then** l'application propose de prendre ou choisir des photos et d'ajouter une note facultative.
2. **Given** l'écran de remise ouvert sans aucune photo ajoutée, **When** le locataire tente de valider, **Then** la validation est refusée avec un message expliquant que la photo est obligatoire.
3. **Given** au moins une photo ajoutée, **When** le locataire valide, **Then** la location passe en cours et l'état des lieux de remise est consultable par les deux parties.

---

### User Story 2 - Le locataire documente le retour et peut signaler un problème (Priority: P2)

À la restitution, le locataire confirme le retour selon le même parcours, mais il peut cette fois
qualifier l'état de l'objet : conforme, problème mineur, ou dégradé. S'il déclare autre chose que
« conforme », une note explicative devient obligatoire en plus des photos.

**Why this priority**: Complète la preuve en fermant la boucle. Sans état de retour, on ne peut pas
comparer, mais l'état initial garde une valeur dissuasive — d'où la priorité 2 plutôt que 1.

**Independent Test**: Sur une location en cours, confirmer le retour en déclarant un problème :
la validation doit exiger une note, et l'état des lieux de retour doit refléter la qualification.

**Acceptance Scenarios**:

1. **Given** une location en cours, **When** le locataire confirme le retour, **Then** il choisit explicitement l'état constaté parmi trois niveaux.
2. **Given** un état déclaré « problème » ou « dégradé » sans note, **When** le locataire valide, **Then** la validation est refusée jusqu'à saisie d'une explication.
3. **Given** un retour validé, **When** l'une des parties consulte la réservation, **Then** les deux états des lieux (remise et retour) sont visibles côte à côte.

---

### User Story 3 - Le propriétaire consulte et conteste un état des lieux (Priority: P3)

Depuis sa réservation, le propriétaire voit les états des lieux déposés par le locataire, avec
photos, notes, date et heure. S'il n'est pas d'accord avec ce qui a été déclaré, il peut ajouter sa
propre observation photo à la même étape, sans écraser celle du locataire.

**Why this priority**: Rétablit la symétrie exigée par le principe constitutionnel I (aucune
asymétrie d'information). Sans cette histoire, la preuve reste unilatérale — acceptable pour un
premier déploiement, insuffisant à terme.

**Independent Test**: En tant que propriétaire d'une annonce louée, ouvrir la réservation :
les états des lieux du locataire sont visibles, et l'ajout d'une contre-observation est possible.

**Acceptance Scenarios**:

1. **Given** un état des lieux déposé par le locataire, **When** le propriétaire ouvre la réservation, **Then** il voit les photos, la note, la qualification et l'horodatage.
2. **Given** un état des lieux qu'il conteste, **When** le propriétaire ajoute sa propre observation, **Then** les deux versions coexistent et sont attribuées nominativement.

---

### Edge Cases

- Que se passe-t-il si le réseau est indisponible au moment de la remise (cas fréquent : parking, sous-sol) ? La confirmation ne doit pas être perdue ni provoquer un doublon en cas de nouvelle tentative.
- Que se passe-t-il si l'utilisateur refuse l'accès à l'appareil photo du téléphone ? Un chemin alternatif (choisir une image existante) doit rester disponible.
- Que se passe-t-il si une photo est très volumineuse ou si l'utilisateur en ajoute beaucoup ? La taille doit être bornée pour ne pas bloquer l'envoi.
- Que se passe-t-il si un état des lieux de remise a déjà été déposé et que l'utilisateur revient sur l'écran ? Il consulte l'existant, il ne le remplace pas silencieusement.
- Que se passe-t-il si le retour est confirmé sans qu'aucune remise n'ait été enregistrée ? L'ordre logique remise → retour doit être respecté ou explicitement justifié.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Le système MUST permettre au locataire d'attacher au moins une et au plus cinq photos à un état des lieux.
- **FR-002**: Le système MUST refuser la confirmation d'une remise ou d'un retour tant qu'aucune photo n'a été fournie.
- **FR-003**: Le système MUST permettre de qualifier l'état constaté selon trois niveaux : conforme, problème mineur, dégradé.
- **FR-004**: Le système MUST exiger une note explicative lorsque l'état déclaré n'est pas « conforme ».
- **FR-005**: Le système MUST horodater chaque état des lieux et l'attribuer nominativement à son auteur.
- **FR-006**: Les deux parties MUST pouvoir consulter tous les états des lieux d'une réservation, sans pouvoir les modifier ni les supprimer après validation.
- **FR-007**: Le système MUST empêcher l'enregistrement de deux états des lieux de même nature (remise ou retour) par le même utilisateur pour une même réservation.
- **FR-008**: Le système MUST conserver les photos de manière à rester consultables tant que la réservation existe.
- **FR-009**: Le système MUST proposer une alternative à la prise de vue directe lorsque l'accès à l'appareil photo est refusé.
- **FR-010**: Le système MUST informer clairement l'utilisateur, avant validation, que l'état des lieux est définitif et partagé avec l'autre partie.
- **FR-011**: Le système MUST limiter le poids total des photos transmises pour un même état des lieux à une valeur compatible avec une connexion mobile ordinaire.

### Key Entities

- **État des lieux** : constat effectué à un moment précis du cycle de location. Porte une nature (remise ou retour), une qualification d'état, une note libre, une collection de photos, un auteur et un horodatage. Rattaché à une réservation unique. Immuable après validation.
- **Réservation** : entité existante, à laquelle se rattachent zéro à plusieurs états des lieux. Sa progression (en cours, terminée) dépend désormais du dépôt des constats.
- **Photo de constat** : image attachée à un état des lieux, conservée avec lui et consultable par les deux parties uniquement.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100 % des locations démarrées comportent un état des lieux de remise avec au moins une photo (la validation le rend obligatoire).
- **SC-002**: Un utilisateur complète un état des lieux (photos + validation) en moins de 90 secondes sur le terrain.
- **SC-003**: Les deux parties peuvent retrouver les constats d'une location en moins de 3 interactions depuis l'écran de leurs réservations.
- **SC-004**: Aucun litige déclaré ne reste sans élément de preuve horodaté attribuable à l'une des parties.
- **SC-005**: Le parcours reste réalisable de bout en bout sans aucun moyen de paiement enregistré, conformément au modèle en espèces.

## Assumptions

- Les deux parties sont physiquement présentes au moment de la remise et du retour : les constats sont donc pris sur le terrain, souvent en extérieur, éventuellement avec un réseau dégradé.
- Le locataire est l'auteur principal des constats dans un premier temps ; la contribution du propriétaire (histoire P3) peut être livrée ultérieurement sans invalider les histoires P1 et P2.
- L'infrastructure de réservation, d'authentification et de notification existante est réutilisée : cette fonctionnalité n'introduit ni nouveau modèle de compte ni nouveau canal de communication.
- Le stockage des photos réutilise le mécanisme déjà employé pour les photos d'annonces, afin de ne pas introduire de dépendance externe supplémentaire (principe constitutionnel V).
- La conservation des constats suit la durée de vie de la réservation associée ; aucune politique de rétention distincte n'est définie à ce stade.
- L'arbitrage humain d'un litige reste hors périmètre : cette fonctionnalité produit la preuve, elle ne tranche pas.

## Alignement constitutionnel

- **Principe I (confiance avant fonctionnalité)** : cette fonctionnalité est l'application directe du principe — elle répond à « qu'est-ce qui protège les deux parties si ça se passe mal ? ».
- **Principe II (zéro commission)** : aucun prélèvement introduit ; SC-005 garantit que le parcours reste gratuit et sans moyen de paiement.
- **Principe III (friction minimale)** : deux étapes obligatoires sont ajoutées à un parcours critique. Elles sont justifiées par un gain de confiance mesurable (SC-001, SC-004), conformément à la clause d'exception du principe.
- **Principe IV (vérifié en réel)** : les trois histoires sont indépendamment testables et devront être couvertes par la suite E2E avant livraison.
- **Principe V (local et simple)** : réutilisation du stockage photo existant, aucune dépendance nouvelle.
