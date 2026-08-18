# Spécification : trouver un objet, gérer son annonce

**Créée le** : 2026-08-18
**Statut** : en cours

## Pourquoi

Quatre manques se répondent : on ne trouve pas ce qu'on cherche (la recherche
filtre les 200 dernières annonces déjà téléchargées), on réserve à l'aveugle
(les dates prises ne sont visibles qu'après le refus du serveur), on ne peut pas
corriger une annonce publiée, et les textes libres des annonces et des messages
échappent au filtre de contenu appliqué partout ailleurs.

## Scénarios utilisateur

### US1 — Chercher (priorité P1)

Une personne cherche « perceuse ». Elle tape sa requête et obtient les annonces
correspondantes, où que soit le mot : dans le titre, la description ou l'adresse.
Elle peut restreindre à une fourchette de prix et trier.

**Test indépendant** : une annonce dont le mot recherché n'apparaît QUE dans la
description remonte dans les résultats.

### US2 — Voir les dates libres (priorité P1)

Avant de choisir ses dates, la personne voit le calendrier de l'annonce : les
jours déjà réservés ou bloqués par le propriétaire sont visiblement indisponibles
et ne peuvent pas être sélectionnés.

**Test indépendant** : réserver un jour déjà pris est impossible dans l'interface,
sans aller-retour serveur.

### US3 — Bloquer ses dates (priorité P2)

Un propriétaire part en vacances : il ouvre le calendrier de son annonce et rend
ces jours indisponibles. Personne ne peut plus les réserver.

### US4 — Corriger son annonce (priorité P2)

Le prix a changé, la photo est floue, une faute s'est glissée dans le titre : le
propriétaire modifie son annonce sans la supprimer et la republier — ce qui lui
ferait perdre ses avis.

### US5 — Même filtre pour tous les textes (priorité P2)

Un contenu interdit publié dans une annonce ou envoyé en message est refusé,
comme il l'est déjà dans un motif de signalement.

## Exigences

- **FR-001** : la recherche s'exécute côté serveur sur le titre, la description
  et l'adresse, insensible à la casse et aux accents.
- **FR-002** : filtres facultatifs — catégorie, prix minimum, prix maximum.
- **FR-003** : tri — plus récentes (défaut), prix croissant, prix décroissant.
- **FR-004** : la requête est envoyée après une pause de frappe, pas à chaque
  caractère.
- **FR-005** : le calendrier affiche les jours indisponibles (réservés + bloqués)
  et interdit leur sélection, y compris à l'intérieur d'une plage.
- **FR-006** : les jours passés ne sont pas sélectionnables.
- **FR-007** : le propriétaire peut basculer la disponibilité d'un jour ; un jour
  déjà réservé ne peut pas être débloqué depuis cet écran.
- **FR-008** : la modification d'annonce reprend les champs de la création et
  n'envoie que ce qui a changé.
- **FR-009** : la modification est réservée au propriétaire (déjà garanti côté
  serveur par le filtre `owner_id`).
- **FR-010** : `check_content` s'applique au titre + description d'une annonce
  (création et modification) et au contenu d'un message. Un contenu interdit est
  refusé avec un message explicite ; un contenu douteux est marqué, pas bloqué.

## Hors périmètre

- Recherche géographique par rayon (l'adresse suffit à ce stade).
- Indexation plein texte MongoDB (`$text`) : la base est locale et petite.
- Récurrence des blocages (« tous les week-ends »).

## Critères de succès

- **SC-001** : une recherche par mot présent uniquement dans la description
  renvoie l'annonce.
- **SC-002** : la sélection d'un jour indisponible est impossible dans l'interface.
- **SC-003** : bloquer un jour depuis l'écran propriétaire le rend non réservable.
- **SC-004** : modifier le prix d'une annonce le reflète dans la liste, sans
  perdre les avis.
- **SC-005** : une annonce et un message contenant un terme interdit sont refusés.
- **SC-006** : `./run-e2e.sh` vert.
