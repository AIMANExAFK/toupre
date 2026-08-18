# Plan d'implémentation

## Contrôle constitutionnel

| Principe | Effet sur ce plan |
|---|---|
| I. Confiance avant fonctionnalité | US5 étend le filtre aux textes les plus vus. Le blocage doit être étroit : mieux vaut laisser passer un contenu douteux (marqué) que refuser une annonce honnête. |
| II. Zéro commission | Aucun impact. |
| III. Friction minimale | US2 supprime l'aller-retour « je choisis, le serveur refuse ». Le calendrier doit rendre l'erreur impossible plutôt que la signaler. |
| IV. Vérifié en réel | Chaque exigence est vérifiée par appel HTTP réel et/ou test E2E sur le rendu. |
| V. Local et simple | Pas d'index plein texte ni de dépendance de calendrier : un composant maison, cohérent avec le thème. |

## Choix techniques

**Recherche** — `GET /listings` étendu : `q`, `category`, `min_price`, `max_price`,
`sort`. Le `q` devient une regex sur trois champs via `$or`. Les accents sont
retirés côté serveur ET côté document au moment de la comparaison : plutôt qu'une
collation Mongo, on normalise le motif et on compare sur une classe de caractères
(`e` matche `é|è|ê`), ce qui reste lisible et sans migration.

**Calendrier** — nouveau `src/Calendrier.tsx`, sans dépendance : grille mensuelle,
navigation mois précédent/suivant, deux modes :
- `mode="plage"` (locataire) : premier appui = début, second = fin ; une plage qui
  enjambe un jour indisponible est refusée à la sélection.
- `mode="bascule"` (propriétaire) : chaque appui bascule le blocage d'un jour.

Le composant reçoit les jours indisponibles et ne connaît pas l'API : il reste
testable et réutilisable.

**Modification d'annonce** — `app/listing/edit.tsx`, alimenté par `GET /listings/{id}`,
n'envoie que les champs modifiés. Entrée depuis « Mes objets ».

**Filtre de contenu** — appliqué dans `create_listing`, `update_listing` et
`send_message`. Message d'erreur en français, explicite sur ce qui est refusé.

## Risque identifié

Étendre le filtre aux annonces peut créer des faux positifs (« pistolet à
peinture », « pistolet à colle »). Les motifs armes sont resserrés en conséquence
et le résultat vérifié sur des cas concrets.
