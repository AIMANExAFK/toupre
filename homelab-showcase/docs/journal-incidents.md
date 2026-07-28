# Journal d'incidents

Chaque panne du lab est consignée ici. Le format suit la logique d'une fiche d'incident
d'exploitation : symptôme observé, démarche de diagnostic, cause racine, correction, puis
mesure de prévention.

C'est la partie la plus utile du lab : elle montre ce que je sais diagnostiquer, pas seulement
ce que je sais installer.

---

## INC-001 — Résolution DNS interne cassée sur les postes clients

**Gravité** : majeure · **Détection** : signalement utilisateur · **Résolution** : 40 min

**Symptôme.** Après bascule du rôle DHCP de pfSense vers SRV-DC01, les postes du VLAN 20
n'accédaient plus aux partages par nom (`\\SRV-DC01\partage`) alors que l'accès par adresse IP
fonctionnait. Internet restait accessible.

**Diagnostic.** L'accès par IP fonctionnel a immédiatement écarté une panne réseau et orienté
vers la résolution de noms. `ipconfig /all` sur un poste a montré un serveur DNS pointant vers
`1.1.1.1` au lieu de `10.10.10.10`. `nslookup srv-dc01.lab.local` échouait, confirmant que le
résolveur public ne connaissait évidemment pas la zone interne.

**Cause racine.** La nouvelle étendue DHCP sur SRV-DC01 avait été créée sans renseigner l'option
006 (serveurs DNS). Les clients recevaient donc le résolveur public hérité de la configuration
par défaut.

**Correction.** Option 006 positionnée sur `10.10.10.10`, puis `ipconfig /renew` sur les postes.

**Prévention.** Rédaction d'une liste de contrôle de bascule de service, imposant la comparaison
des options DHCP avant et après migration. Ajout d'une sonde Zabbix qui résout un nom interne
depuis un poste témoin toutes les 5 minutes.

---

## INC-002 — Impossible de joindre un poste au domaine

**Gravité** : mineure · **Détection** : lors d'un déploiement · **Résolution** : 25 min

**Symptôme.** La jonction au domaine d'un poste Windows 11 fraîchement installé échouait avec un
message d'identifiants invalides, alors que le compte utilisé était bien administrateur du
domaine et fonctionnait ailleurs.

**Diagnostic.** Le message d'erreur était trompeur. Le DNS résolvait correctement, la connectivité
vers le contrôleur était bonne. En comparant `w32tm /query /status` sur le poste et sur
SRV-DC01, j'ai relevé un écart d'horloge de près de 9 minutes.

**Cause racine.** Kerberos rejette toute authentification dont l'horodatage dévie de plus de
5 minutes — protection contre le rejeu. Le poste, installé depuis une image ancienne, n'avait
pas encore synchronisé son horloge.

**Correction.** `w32tm /resync` après avoir pointé le poste sur le contrôleur de domaine comme
source de temps.

**Prévention.** Synchronisation NTP sur SRV-DC01 intégrée à l'image de déploiement, et ajout de
la vérification d'horloge en première étape de la procédure de jonction au domaine.

---

## INC-003 — Saturation du stockage de l'hyperviseur

**Gravité** : critique · **Détection** : arrêt de VM · **Résolution** : 1 h 15

**Symptôme.** Deux machines virtuelles se sont arrêtées d'elles-mêmes pendant la nuit. L'interface
Proxmox signalait un volume de stockage à 100 %.

**Diagnostic.** `pvesm status` puis `du -sh` sur le point de montage de sauvegarde ont montré que
les archives de sauvegarde occupaient l'essentiel de l'espace. Aucune politique de rétention
n'était configurée : chaque sauvegarde quotidienne s'accumulait depuis la mise en service.

**Cause racine.** Absence de rétention sur la tâche de sauvegarde, combinée à l'absence
d'alerte sur le remplissage du volume. Le problème était prévisible et n'a été vu qu'à
l'épuisement complet.

**Correction.** Purge des archives les plus anciennes pour libérer l'espace, redémarrage des VM,
puis configuration d'une rétention (7 quotidiennes, 4 hebdomadaires).

**Prévention.** Alerte Zabbix à 80 % de remplissage et alerte critique à 90 % sur tous les
volumes. Déplacement du stockage de sauvegarde sur un volume distinct de celui des VM, pour
qu'une dérive de sauvegarde ne puisse plus arrêter la production.

**Ce que j'en retiens.** La supervision doit précéder la mise en service, pas la suivre. C'est
exactement la logique de continuité de service que j'ai vue appliquée en milieu hospitalier.

---

## INC-004 — Règle de filtrage trop permissive (revue trimestrielle)

**Gravité** : majeure (non exploitée) · **Détection** : revue planifiée · **Résolution** : 20 min

**Symptôme.** Aucun. Découvert lors de la revue trimestrielle des règles pfSense.

**Diagnostic.** Une règle `DMZ → any` créée pendant la mise au point du serveur web n'avait
jamais été restreinte. Concrètement, un serveur exposé sur Internet pouvait atteindre l'ensemble
du VLAN serveurs, dont le contrôleur de domaine. Vérification par `nmap` depuis SRV-WEB01 :
les ports 445 et 389 de SRV-DC01 répondaient.

**Cause racine.** Règle temporaire de dépannage laissée en place, faute de procédure de
nettoyage après intervention.

**Correction.** Règle supprimée, remplacée par une autorisation sortante limitée aux ports 80 et
443 vers Internet uniquement. Nouvelle vérification `nmap` : plus aucune réponse depuis la DMZ
vers le VLAN 10.

**Prévention.** Toute règle temporaire porte désormais un commentaire daté avec la mention
`TEMP-JJ/MM/AAAA`, et la revue trimestrielle est inscrite au calendrier. C'est le principe de
moindre privilège recommandé par l'ANSSI, appliqué au filtrage.

---

## Modèle pour un nouvel incident

```markdown
## INC-XXX — Titre court et factuel

**Gravité** : mineure / majeure / critique · **Détection** : … · **Résolution** : … min

**Symptôme.** Ce qui a été observé, sans interprétation.

**Diagnostic.** La démarche suivie, dans l'ordre, avec les commandes utilisées et ce que
chaque résultat a permis d'écarter.

**Cause racine.** La cause réelle, pas le symptôme.

**Correction.** Ce qui a rétabli le service.

**Prévention.** Ce qui a été mis en place pour que cela ne se reproduise pas.
```
