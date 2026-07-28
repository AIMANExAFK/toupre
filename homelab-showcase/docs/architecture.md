# Architecture du lab

Infrastructure montée sur **matériel physique personnel** — postes récupérés et remis en
service, switch administrable, pare-feu dédié. Le choix du physique plutôt que du tout-virtuel
est délibéré : câblage réel, commutation réelle, pannes matérielles réelles.

> **À ajuster avant publication** — les lignes marquées d'un `▸` doivent être vérifiées contre
> votre installation réelle (modèles, quantités, adressage). Le reste de la structure est bon.

## Principes de conception

1. **Refus par défaut.** Aucun trafic inter-VLAN n'est autorisé tant qu'une règle explicite ne
   l'ouvre pas. Chaque règle ouverte est justifiée dans le tableau plus bas.
2. **Séparation de l'administration.** Les interfaces d'administration ne sont joignables que
   depuis le VLAN de management.
3. **La DMZ ne remonte jamais.** Un service exposé compromis ne doit pas pouvoir atteindre le
   VLAN serveurs.
4. **Rien n'est en service sans sauvegarde.** Un service ajouté sans plan de sauvegarde est
   considéré comme non déployé.

## Matériel

▸ *Adapter à votre parc réel.*

| Rôle | Machine | Système | Fonction |
|---|---|---|---|
| Pare-feu / routeur | PC dédié, 2 cartes réseau | pfSense | Routage inter-VLAN, NAT, filtrage |
| Contrôleur de domaine | PC physique | Windows Server 2022 | AD DS, DNS, DHCP |
| Serveur de services | PC physique | Ubuntu Server | GLPI, services internes |
| Poste client | PC physique | Windows 11 | Poste de test joint au domaine |
| Commutation | Switch administrable | — | Étiquetage 802.1Q, VLAN |

Certaines machines virtuelles complémentaires tournent sous **VirtualBox** sur le serveur de
services, pour les tests qui ne justifient pas une machine dédiée.

## Plan d'adressage

▸ *Vérifier que ces réseaux correspondent aux vôtres.*

| VLAN | Nom | Réseau | Passerelle | Contenu |
|---|---|---|---|---|
| 10 | Serveurs | 10.10.10.0/24 | 10.10.10.1 | Contrôleur de domaine, GLPI |
| 20 | Postes clients | 10.10.20.0/24 | 10.10.20.1 | Postes joints au domaine |
| 30 | DMZ | 10.10.30.0/24 | 10.10.30.1 | Services exposés |
| 40 | Management | 10.10.40.0/24 | 10.10.40.1 | pfSense, switch, poste d'administration |

### Conventions d'adressage

| Plage | Usage |
|---|---|
| `.1` | Passerelle (pfSense) |
| `.10` – `.49` | Serveurs à adresse fixe |
| `.100` – `.199` | Étendue DHCP |
| `.200` – `.254` | Équipements réseau |

## Commutation

Le switch administrable porte les VLAN en 802.1Q. Le lien vers pfSense est un port **tagué**
transportant tous les VLAN (trunk) ; les ports vers les machines sont **non tagués** et affectés
au VLAN correspondant (access).

C'est le point qui distingue un lab physique d'un lab virtuel : ici, une erreur de tag sur un
port se traduit par une machine qui ne voit plus rien, et il faut savoir le diagnostiquer au
niveau de la couche 2.

## Matrice de filtrage inter-VLAN

| Source | Destination | Ports | Autorisé | Justification |
|---|---|---|---|---|
| VLAN 20 | Contrôleur de domaine | 53, 88, 135, 389, 445, 464 | Oui | DNS, Kerberos, partages, jonction au domaine |
| VLAN 20 | GLPI | 443 | Oui | Portail de tickets |
| VLAN 20 | VLAN 10 (reste) | — | **Non** | Aucun besoin |
| VLAN 20 | VLAN 40 | — | **Non** | L'administration n'est pas joignable depuis les postes |
| VLAN 30 | VLAN 10 | — | **Non** | Cloisonnement de la DMZ |
| VLAN 30 | Internet | 80, 443 sortant | Oui | Mises à jour |
| VLAN 40 | Tous | — | Oui | Poste d'administration |

## Structure de l'annuaire

```
lab.local
├── OU=LAB
│   ├── OU=Utilisateurs
│   │   ├── OU=Standard
│   │   └── OU=Administration
│   ├── OU=Postes
│   ├── OU=Serveurs
│   └── OU=Groupes
```

**Stratégies de groupe** ▸ *ne garder que celles réellement en place.*

| GPO | Cible | Effet |
|---|---|---|
| `GPO-Mot-de-passe` | Domaine | Longueur minimale, complexité, historique |
| `GPO-Verrouillage-session` | OU=Postes | Verrouillage après inactivité |
| `GPO-Durcissement-poste` | OU=Postes | SMBv1 désactivé, pare-feu actif |

## Services

| Service | Hôte | Rôle |
|---|---|---|
| Active Directory (AD DS) | Windows Server | Annuaire, authentification Kerberos |
| DNS | Windows Server | Résolution de la zone `lab.local` |
| DHCP | Windows Server | Étendues par VLAN, option 006 (DNS) renseignée |
| GLPI | Ubuntu Server | Inventaire du parc et gestion des tickets |
| pfSense | PC dédié | Routage, NAT, filtrage, journalisation |

## Spécificités du matériel physique

Ce que le virtuel ne fait pas apprendre, et que ce lab impose :

- **Câblage et étiquetage.** Un câble mal repéré coûte plus de temps qu'une erreur de
  configuration.
- **Configuration du switch.** Tags VLAN, ports trunk et access — invisible en tout-virtuel.
- **Pannes matérielles.** Disque qui lâche, alimentation instable, carte réseau qui négocie mal
  son débit. Ce sont des incidents que l'on ne rencontre jamais dans un hyperviseur.
- **Contrainte de ressources.** Chaque service doit être placé sur la machine qui peut le
  porter, ce qui oblige à arbitrer réellement.

## Sauvegarde

▸ *Décrire ce qui est réellement en place — ne rien annoncer qui n'existe pas.*

- Sauvegarde des données du contrôleur de domaine et de la base GLPI
- Export de la configuration pfSense après chaque modification
- Test de restauration périodique — une sauvegarde jamais restaurée n'est pas une sauvegarde
