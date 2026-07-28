# À lire avant de publier ce dépôt

**Ce dépôt est une ossature, pas un dossier terminé.** Il est prêt à devenir votre vitrine,
mais une partie de son contenu doit devenir vraie avant d'être rendue publique.

---

## Ce qui est à vous, utilisable immédiatement

Les **quatre scripts** sont fonctionnels et vous appartiennent. Ils ont été contrôlés :

- `audit-durcissement-anssi.sh` — exécuté et testé, sortie texte et JSON valides
- `backup-vers-nas.sh` — syntaxe et chemins d'erreur testés
- `Invoke-ADHealthAudit.ps1` — non exécutable ici faute d'annuaire ; **à tester dans votre lab
  avant publication**
- `New-ADUsersFromCsv.ps1` — idem ; commencez systématiquement par `-WhatIf`

La **procédure PROC-001** et la **structure de la documentation** sont réutilisables telles
quelles.

---

## Ce qui doit devenir vrai avant publication

### 1. L'architecture

Le fichier `docs/architecture.md` décrit une infrastructure cohérente et réaliste — cinq VLAN,
AD, pfSense, Wazuh, Zabbix, GLPI. **Elle n'existera que quand vous l'aurez montée.**

Ajustez le document à ce que vous déployez réellement : si vous n'installez pas Wazuh la
première semaine, retirez-le. Un lab plus modeste mais réel vaut infiniment mieux qu'une
architecture décrite qui n'existe pas. Un recruteur qui demande une capture d'écran de votre
Zabbix ne doit pas vous mettre en difficulté.

### 2. Le journal d'incidents — le point le plus sensible

Les quatre incidents (INC-001 à INC-004) sont des **exemples pédagogiques** que j'ai rédigés.
Ils sont réalistes — ce sont les pannes les plus courantes de ce type de lab, et vous les
rencontrerez très probablement — mais **ce ne sont pas encore les vôtres**.

Deux façons honnêtes de procéder :

**Option A, recommandée.** Montez le lab, notez vos vraies pannes au fil de l'eau, et remplacez
les entrées. Vous rencontrerez presque certainement l'oubli de l'option DHCP 006 et la dérive
d'horloge Kerberos : ce sont des grands classiques. Le jour où ça vous arrive, la fiche devient
authentique.

**Option B.** Reproduisez volontairement chaque panne dans le lab pour l'étudier — c'est un
excellent exercice — et indiquez-le : « incident reproduit volontairement à des fins
d'apprentissage ». C'est parfaitement valorisable et parfaitement honnête.

**Ce qu'il ne faut pas faire :** publier ces fiches telles quelles en laissant croire que vous
les avez vécues. Un responsable infra qui vous demande en entretien « racontez-moi l'INC-003 »
et qui sent le récit vaciller ne retiendra qu'une chose, et il aura raison de la retenir.

### 3. Les chiffres du README

« 99 % de disponibilité », « six mois d'exploitation » : ne les écrivez que lorsqu'ils seront
mesurés. Tant que le lab a trois semaines, dites trois semaines. La modestie vérifiable bat
l'ambition invérifiable.

---

## Ordre de montage suggéré

| Étape | Contenu | Durée |
|---|---|---|
| 1 | Proxmox VE sur la machine hôte | 2 h |
| 2 | pfSense, VLAN, plan d'adressage, règles en refus par défaut | 3 h |
| 3 | Windows Server 2022 — AD DS, DNS, DHCP | 3 h |
| 4 | Poste Windows 11 joint au domaine + GPO de base | 2 h |
| 5 | Zabbix — supervision des hôtes | 3 h |
| 6 | Sauvegardes + premier test de restauration | 2 h |
| 7 | Wazuh — SIEM et remontée des agents | 4 h |
| 8 | GLPI — inventaire | 2 h |

Environ trois week-ends. Les étapes 1 à 4 suffisent déjà à parler d'un lab crédible en
entretien — n'attendez pas l'étape 8 pour publier.

**Matériel minimum** : une machine avec 32 Go de RAM et un SSD de 500 Go. À défaut, VirtualBox
sur un poste avec 16 Go permet de couvrir les étapes 2 à 4.

---

## Publier sur GitHub

```bash
cd homelab-showcase
git init
git add .
git commit -m "Homelab : architecture, procedures et scripts d'exploitation"
git branch -M main
git remote add origin https://github.com/<votre-compte>/homelab.git
git push -u origin main
```

Nommez le dépôt `homelab` ou `infrastructure-lab` — pas `test` ni `projet1`.

Renseignez la description du dépôt : *Infrastructure segmentée auto-hébergée — Active Directory,
pfSense, supervision, SIEM. Documentation et scripts d'exploitation.*

Puis ajoutez le lien à votre CV, à votre profil LinkedIn et à votre portfolio.

---

## Une fois le lab en service

Dites-le-moi et j'ajoute au CV le bloc correspondant — projet homelab en tête de section et lien
GitHub dans l'en-tête. Je ne l'ai volontairement pas fait maintenant : tant que le lab n'existe
pas, ce serait une affirmation fausse sur un document de candidature.
