#Requires -Modules ActiveDirectory
<#
.SYNOPSIS
    Audit de santé d'un annuaire Active Directory.

.DESCRIPTION
    Contrôle quatre familles de dérives courantes dans un annuaire :

      - comptes utilisateurs inactifs depuis plus de N jours et toujours actifs ;
      - comptes dont le mot de passe n'expire jamais ;
      - appartenance aux groupes à privilèges (principe de moindre privilège) ;
      - comptes d'ordinateurs qui ne se sont plus authentifiés depuis plus de N jours.

    Produit un rapport HTML lisible et un export CSV par contrôle.

.PARAMETER SearchBase
    Unité d'organisation de départ. Par défaut, le domaine courant.

.PARAMETER InactiveDays
    Seuil d'inactivité en jours. 90 par défaut.

.PARAMETER OutputPath
    Répertoire de sortie des rapports. .\rapports par défaut.

.EXAMPLE
    .\Invoke-ADHealthAudit.ps1 -Verbose

.EXAMPLE
    .\Invoke-ADHealthAudit.ps1 -SearchBase "OU=LAB,DC=lab,DC=local" -InactiveDays 60

.NOTES
    Auteur : Aïmane Ramzi
    Lecture seule — le script ne modifie jamais l'annuaire.
#>
[CmdletBinding()]
param(
    [string]$SearchBase,
    [ValidateRange(1, 3650)]
    [int]$InactiveDays = 90,
    [string]$OutputPath = ".\rapports"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# --- Préparation ---------------------------------------------------------

try {
    Import-Module ActiveDirectory -ErrorAction Stop
}
catch {
    throw "Le module ActiveDirectory est introuvable. Installez RSAT-AD-PowerShell."
}

if (-not $SearchBase) {
    $SearchBase = (Get-ADDomain).DistinguishedName
    Write-Verbose "SearchBase non fourni, utilisation du domaine courant : $SearchBase"
}

if (-not (Test-Path -LiteralPath $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
}

$horodatage = Get-Date -Format 'yyyyMMdd-HHmmss'
$seuil      = (Get-Date).AddDays(-$InactiveDays)

Write-Verbose "Seuil d'inactivité : $($seuil.ToString('yyyy-MM-dd')) ($InactiveDays jours)"

# --- Contrôle 1 : comptes utilisateurs inactifs --------------------------

Write-Verbose "Contrôle 1/4 — comptes utilisateurs inactifs"

$comptesInactifs = Get-ADUser -SearchBase $SearchBase -Filter 'Enabled -eq $true' -Properties LastLogonDate, whenCreated, Description |
    Where-Object {
        # Un compte jamais connecté mais créé récemment n'est pas une dérive.
        if ($null -eq $_.LastLogonDate) { $_.whenCreated -lt $seuil }
        else { $_.LastLogonDate -lt $seuil }
    } |
    Select-Object Name, SamAccountName, LastLogonDate, whenCreated, Description |
    Sort-Object LastLogonDate

# --- Contrôle 2 : mots de passe sans expiration --------------------------

Write-Verbose "Contrôle 2/4 — mots de passe qui n'expirent jamais"

$motsDePasseEternels = Get-ADUser -SearchBase $SearchBase -Filter 'Enabled -eq $true -and PasswordNeverExpires -eq $true' -Properties PasswordLastSet, PasswordNeverExpires |
    Select-Object Name, SamAccountName, PasswordLastSet |
    Sort-Object PasswordLastSet

# --- Contrôle 3 : groupes à privilèges -----------------------------------

Write-Verbose "Contrôle 3/4 — appartenance aux groupes à privilèges"

$groupesSensibles = @(
    'Domain Admins', 'Admins du domaine',
    'Enterprise Admins', 'Administrateurs de l''entreprise',
    'Schema Admins', 'Administrateurs du schéma',
    'Administrators', 'Administrateurs'
)

$membresPrivilegies = foreach ($nomGroupe in $groupesSensibles) {
    $groupe = Get-ADGroup -Filter "Name -eq '$nomGroupe'" -ErrorAction SilentlyContinue
    if (-not $groupe) { continue }

    Get-ADGroupMember -Identity $groupe -Recursive -ErrorAction SilentlyContinue |
        Where-Object { $_.objectClass -eq 'user' } |
        ForEach-Object {
            $u = Get-ADUser -Identity $_.SamAccountName -Properties LastLogonDate, Enabled
            [pscustomobject]@{
                Groupe         = $groupe.Name
                Nom            = $u.Name
                SamAccountName = $u.SamAccountName
                Actif          = $u.Enabled
                DerniereOuverture = $u.LastLogonDate
            }
        }
}

# --- Contrôle 4 : postes obsolètes ---------------------------------------

Write-Verbose "Contrôle 4/4 — comptes d'ordinateurs obsolètes"

$postesObsoletes = Get-ADComputer -SearchBase $SearchBase -Filter 'Enabled -eq $true' -Properties LastLogonDate, OperatingSystem |
    Where-Object { $null -ne $_.LastLogonDate -and $_.LastLogonDate -lt $seuil } |
    Select-Object Name, OperatingSystem, LastLogonDate |
    Sort-Object LastLogonDate

# --- Exports CSV ---------------------------------------------------------

$exports = [ordered]@{
    'comptes-inactifs'      = $comptesInactifs
    'mots-de-passe-eternels'= $motsDePasseEternels
    'groupes-privilegies'   = $membresPrivilegies
    'postes-obsoletes'      = $postesObsoletes
}

foreach ($nom in $exports.Keys) {
    $donnees = $exports[$nom]
    $chemin  = Join-Path $OutputPath "$horodatage-$nom.csv"
    if ($donnees) {
        $donnees | Export-Csv -Path $chemin -NoTypeInformation -Encoding UTF8
        Write-Verbose "Export : $chemin"
    }
}

# --- Rapport HTML --------------------------------------------------------

function ConvertTo-Section {
    param([string]$Titre, [object]$Donnees, [string]$Commentaire)

    $nb = @($Donnees).Count
    $classe = if ($nb -eq 0) { 'ok' } else { 'alerte' }
    $corps = if ($nb -eq 0) {
        "<p class='ok'>Aucune anomalie détectée.</p>"
    } else {
        $Donnees | ConvertTo-Html -Fragment
    }

    "<section><h2 class='$classe'>$Titre — $nb</h2><p class='note'>$Commentaire</p>$corps</section>"
}

$style = @"
<style>
 body { font-family: Segoe UI, Arial, sans-serif; margin: 2rem; color:#111; }
 h1 { border-bottom: 2px solid #111; padding-bottom:.3rem; }
 h2.ok { color:#1a7f37; } h2.alerte { color:#b3261e; }
 p.ok { color:#1a7f37; } p.note { color:#555; font-size:.9rem; }
 table { border-collapse: collapse; width:100%; margin:.5rem 0 1.5rem; font-size:.9rem; }
 th, td { border:1px solid #ccc; padding:.35rem .5rem; text-align:left; }
 th { background:#f2f2f2; }
</style>
"@

$sections = @(
    ConvertTo-Section -Titre "Comptes actifs inactifs depuis plus de $InactiveDays jours" -Donnees $comptesInactifs `
        -Commentaire "Un compte actif mais inutilisé est une surface d'attaque sans contrepartie. À désactiver après validation auprès du responsable."
    ConvertTo-Section -Titre "Mots de passe qui n'expirent jamais" -Donnees $motsDePasseEternels `
        -Commentaire "Contraire aux recommandations d'hygiène ANSSI, sauf comptes de service justifiés et documentés."
    ConvertTo-Section -Titre "Membres des groupes à privilèges" -Donnees $membresPrivilegies `
        -Commentaire "Principe de moindre privilège : cette liste doit rester courte et chaque entrée doit être justifiable."
    ConvertTo-Section -Titre "Comptes d'ordinateurs obsolètes" -Donnees $postesObsoletes `
        -Commentaire "Postes probablement retirés du parc sans nettoyage de l'annuaire."
) -join "`n"

$html = @"
<!doctype html><html lang='fr'><head><meta charset='utf-8'>
<title>Audit AD — $horodatage</title>$style</head><body>
<h1>Audit Active Directory</h1>
<p><strong>Périmètre :</strong> $SearchBase<br>
<strong>Date :</strong> $(Get-Date -Format 'dd/MM/yyyy HH:mm')<br>
<strong>Seuil d'inactivité :</strong> $InactiveDays jours</p>
$sections
</body></html>
"@

$cheminHtml = Join-Path $OutputPath "$horodatage-audit-ad.html"
$html | Out-File -FilePath $cheminHtml -Encoding UTF8

# --- Synthèse console ----------------------------------------------------

Write-Host ""
Write-Host "=== Audit Active Directory ===" -ForegroundColor Cyan
Write-Host ("Comptes inactifs (> {0} j)      : {1}" -f $InactiveDays, @($comptesInactifs).Count)
Write-Host ("Mots de passe sans expiration   : {0}" -f @($motsDePasseEternels).Count)
Write-Host ("Membres de groupes privilégiés  : {0}" -f @($membresPrivilegies).Count)
Write-Host ("Postes obsolètes                : {0}" -f @($postesObsoletes).Count)
Write-Host ""
Write-Host "Rapport : $cheminHtml" -ForegroundColor Green
