# PROC-001 — Création d'un utilisateur Active Directory

**Version** 1.1 · **Dernière revue** juillet 2026 · **Durée estimée** 10 min

## Objet

Créer un compte utilisateur dans l'annuaire `lab.local` à l'arrivée d'une personne, de façon
reproductible et traçable.

Cette procédure est rédigée pour qu'une personne qui ne connaît pas l'infrastructure puisse
l'exécuter sans moi. C'est le principe que j'ai vu appliqué en milieu hospitalier : l'exploitation
ne doit jamais dépendre d'une seule personne.

## Prérequis

- Compte membre du groupe `Admins du domaine`
- Poste d'administration du VLAN 40, module RSAT-AD-PowerShell installé
- Demande validée par le responsable du service concerné (référence du ticket GLPI)

## Procédure

### 1. Vérifier l'absence d'homonyme

```powershell
Get-ADUser -Filter "Surname -eq 'Nom'" -Properties Department |
    Select-Object Name, SamAccountName, Department
```

En cas d'homonyme, l'identifiant devient `p.nom2`. Ne jamais réutiliser l'identifiant d'un
compte désactivé : l'historique des droits reste attaché au SID.

### 2. Créer le compte

**Cas d'une arrivée isolée** — via la console `Utilisateurs et ordinateurs Active Directory`,
ou en PowerShell :

```powershell
New-ADUser `
    -Name "Prénom Nom" `
    -GivenName "Prénom" -Surname "Nom" `
    -SamAccountName "p.nom" `
    -UserPrincipalName "p.nom@lab.local" `
    -Path "OU=Standard,OU=Utilisateurs,OU=LAB,DC=lab,DC=local" `
    -Department "Service" -Title "Fonction" `
    -AccountPassword (Read-Host -AsSecureString "Mot de passe initial") `
    -ChangePasswordAtLogon $true `
    -Enabled $true
```

**Cas d'arrivées multiples** — utiliser le script prévu, systématiquement précédé d'une
simulation :

```powershell
# 1. Simuler — ne modifie rien
.\New-ADUsersFromCsv.ps1 -CsvPath .\arrivees.csv `
    -TargetOU "OU=Standard,OU=Utilisateurs,OU=LAB,DC=lab,DC=local" `
    -Domain lab.local -WhatIf

# 2. Exécuter après relecture de la simulation
.\New-ADUsersFromCsv.ps1 -CsvPath .\arrivees.csv `
    -TargetOU "OU=Standard,OU=Utilisateurs,OU=LAB,DC=lab,DC=local" `
    -Domain lab.local
```

### 3. Affecter les groupes

Uniquement les groupes correspondant à la fiche de poste — principe de moindre privilège.

```powershell
Add-ADPrincipalGroupMembership -Identity "p.nom" -MemberOf "GRP-Service-Lecture"
```

> Aucun ajout à un groupe à privilèges sans validation écrite. Ces appartenances sont
> contrôlées par l'audit mensuel (`Invoke-ADHealthAudit.ps1`).

### 4. Vérifier

```powershell
Get-ADUser -Identity "p.nom" -Properties MemberOf, Department, Title, Enabled |
    Format-List Name, SamAccountName, UserPrincipalName, Enabled, Department, Title, MemberOf
```

Puis se connecter avec le compte depuis un poste de test pour confirmer que l'ouverture de
session, le changement de mot de passe imposé et l'accès aux partages fonctionnent.

### 5. Transmettre et tracer

- Identifiant transmis à la personne, mot de passe initial par un **canal distinct** (SMS ou
  remise en main propre) — jamais dans le même message.
- Suppression du CSV des mots de passe initiaux après transmission.
- Clôture du ticket GLPI avec l'identifiant créé et la liste des groupes affectés.

## En cas de problème

| Symptôme | Cause probable | Action |
|---|---|---|
| « Le mot de passe ne satisfait pas aux exigences » | Stratégie `GPO-Mot-de-passe` : 12 caractères, complexité | Rallonger le mot de passe initial |
| Le compte n'apparaît pas sur un autre contrôleur | Réplication non convergée | `repadmin /syncall /AdeP`, puis vérifier |
| Ouverture de session refusée immédiatement | Compte créé désactivé, ou horloge du poste décalée | Vérifier `Enabled`, puis voir INC-002 du journal d'incidents |

## Contrôle associé

Le script `Invoke-ADHealthAudit.ps1` est exécuté mensuellement. Il détecte notamment les comptes
créés puis jamais utilisés — signe fréquent d'une arrivée annulée dont le compte n'a pas été
nettoyé.
