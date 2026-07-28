# Architecture du lab

## Principes de conception

1. **Refus par défaut.** Aucun trafic inter-VLAN n'est autorisé tant qu'une règle explicite ne
   l'ouvre pas. Chaque règle ouverte est justifiée dans le tableau ci-dessous.
2. **Séparation de l'administration.** L'accès aux interfaces d'administration (Proxmox, pfSense,
   iDRAC) passe par le VLAN 40, joignable uniquement depuis un poste d'administration dédié.
3. **La DMZ ne remonte jamais.** Un service exposé compromis ne doit pas pouvoir atteindre le
   VLAN serveurs.
4. **Rien n'est en production sans supervision ni sauvegarde.** Un service ajouté sans sonde
   Zabbix et sans plan de sauvegarde est considéré comme non déployé.

## Plan d'adressage

| VLAN | Nom | Réseau | Passerelle | Contenu |
|---|---|---|---|---|
| 10 | Serveurs | 10.10.10.0/24 | 10.10.10.1 | AD DS, Wazuh, Zabbix, GLPI |
| 20 | Postes clients | 10.10.20.0/24 | 10.10.20.1 | Windows 11 joints au domaine |
| 30 | DMZ | 10.10.30.0/24 | 10.10.30.1 | Service web exposé |
| 40 | Management | 10.10.40.0/24 | 10.10.40.1 | Proxmox, pfSense, poste d'administration |
| 99 | Hors-bande | 10.10.99.0/24 | 10.10.99.1 | Accès de secours |

### Réservations

| Plage | Usage |
|---|---|
| `.1` | Passerelle (pfSense) |
| `.10` – `.49` | Serveurs à adresse fixe |
| `.100` – `.199` | Étendue DHCP |
| `.200` – `.254` | Réservé — équipements réseau |

## Matrice de filtrage inter-VLAN

| Source | Destination | Port / protocole | Autorisé | Justification |
|---|---|---|---|---|
| VLAN 20 (clients) | VLAN 10 — SRV-DC01 | 53, 88, 135, 389, 445, 464 | Oui | Résolution DNS, authentification Kerberos, partages, jonction au domaine |
| VLAN 20 | VLAN 10 — SRV-GLPI | 443 | Oui | Portail de tickets |
| VLAN 20 | VLAN 10 — reste | tout | **Non** | Aucun besoin métier |
| VLAN 20 | VLAN 40 | tout | **Non** | L'administration n'est pas joignable depuis les postes |
| VLAN 30 (DMZ) | VLAN 10 | tout | **Non** | Cloisonnement — voir INC-004 |
| VLAN 30 | Internet | 80, 443 sortant | Oui | Mises à jour |
| VLAN 40 | tous | tout | Oui | Poste d'administration |
| Tous | VLAN 10 — SRV-WAZUH | 1514, 1515 | Oui | Remontée des agents vers le SIEM |

Toute règle est revue trimestriellement. La revue d'avril a produit l'incident INC-004.

## Inventaire des machines virtuelles

| Nom | OS | vCPU | RAM | Disque | Rôle |
|---|---|---|---|---|---|
| SRV-DC01 | Windows Server 2022 | 2 | 4 Go | 60 Go | AD DS, DNS, DHCP |
| SRV-WAZUH | Debian 12 | 4 | 8 Go | 120 Go | SIEM |
| SRV-ZABBIX | Debian 12 | 2 | 4 Go | 40 Go | Supervision |
| SRV-GLPI | Debian 12 | 2 | 4 Go | 40 Go | Inventaire, tickets |
| SRV-WEB01 | Debian 12 | 1 | 2 Go | 20 Go | Service exposé (DMZ) |
| CLI-W11-01 | Windows 11 | 2 | 4 Go | 60 Go | Poste de test joint au domaine |

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

**Stratégies de groupe appliquées**

| GPO | Cible | Effet |
|---|---|---|
| `GPO-Mot-de-passe` | Domaine | 12 caractères minimum, complexité activée, historique de 5 |
| `GPO-Verrouillage-session` | OU=Postes | Verrouillage automatique après 10 minutes d'inactivité |
| `GPO-Durcissement-poste` | OU=Postes | SMBv1 désactivé, PowerShell journalisé, pare-feu actif |
| `GPO-Admin-locaux` | OU=Postes | Appartenance au groupe Administrateurs locaux maîtrisée |

## Sauvegarde et restauration

- **Fréquence** — instantané quotidien des VM via Proxmox Backup Server, conservation 7 jours ;
  sauvegarde hebdomadaire conservée 4 semaines.
- **Hors site** — copie chiffrée hebdomadaire vers un disque externe rotatif.
- **Test de restauration** — une VM restaurée au hasard chaque mois, dans un réseau isolé, avec
  compte rendu consigné. Une sauvegarde jamais restaurée n'est pas une sauvegarde.

## Supervision

Zabbix surveille pour chaque hôte : disponibilité ICMP, charge processeur, mémoire, remplissage
des systèmes de fichiers (alerte à 80 %, critique à 90 %), et l'état des services applicatifs
(AD DS, MariaDB, nginx).

Alertes remontées par courriel. Le seuil de 80 % sur le stockage est né de l'incident INC-003.
