#Requires -Modules ActiveDirectory
<#
.SYNOPSIS
    Création en masse de comptes Active Directory à partir d'un fichier CSV.

.DESCRIPTION
    Lit un CSV, contrôle chaque ligne avant d'agir, puis crée les comptes manquants.
    Le script est conçu pour être rejouable : un compte déjà présent est ignoré, pas écrasé.

    Colonnes attendues :
        Prenom;Nom;Service;Fonction

    Le SamAccountName est dérivé de p.nom, normalisé (accents retirés, minuscules) et
    dédoublonné automatiquement (p.nom, p.nom2, p.nom3…).

.PARAMETER CsvPath
    Chemin du fichier CSV source.

.PARAMETER TargetOU
    Unité d'organisation de destination.

.PARAMETER Domain
    Suffixe UPN, par exemple lab.local.

.PARAMETER Delimiter
    Séparateur du CSV. Point-virgule par défaut (export Excel français).

.EXAMPLE
    .\New-ADUsersFromCsv.ps1 -CsvPath .\arrivees.csv -TargetOU "OU=Standard,OU=Utilisateurs,OU=LAB,DC=lab,DC=local" -Domain lab.local -WhatIf

    Simule la création sans rien modifier. À exécuter systématiquement avant le vrai passage.

.NOTES
    Auteur : Aïmane Ramzi
    Chaque exécution produit un journal horodaté et un CSV des mots de passe initiaux,
    à transmettre par canal séparé puis à détruire.
#>
[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
param(
    [Parameter(Mandatory = $true)]
    [ValidateScript({ Test-Path -LiteralPath $_ -PathType Leaf })]
    [string]$CsvPath,

    [Parameter(Mandatory = $true)]
    [string]$TargetOU,

    [Parameter(Mandatory = $true)]
    [string]$Domain,

    [string]$Delimiter = ';',

    [string]$LogPath = ".\journaux"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Import-Module ActiveDirectory -ErrorAction Stop

if (-not (Test-Path -LiteralPath $LogPath)) {
    New-Item -ItemType Directory -Path $LogPath -Force | Out-Null
}

$horodatage  = Get-Date -Format 'yyyyMMdd-HHmmss'
$journal     = Join-Path $LogPath "$horodatage-creation-comptes.log"
$fichierMdp  = Join-Path $LogPath "$horodatage-mots-de-passe-initiaux.csv"

function Write-Journal {
    param([string]$Message, [ValidateSet('INFO', 'OK', 'IGNORE', 'ERREUR')][string]$Niveau = 'INFO')
    $ligne = "{0} [{1}] {2}" -f (Get-Date -Format 'HH:mm:ss'), $Niveau, $Message
    Add-Content -Path $journal -Value $ligne -Encoding UTF8
    $couleur = switch ($Niveau) { 'OK' { 'Green' } 'IGNORE' { 'Yellow' } 'ERREUR' { 'Red' } default { 'Gray' } }
    Write-Host $ligne -ForegroundColor $couleur
}

function ConvertTo-Ascii {
    <# Retire les accents : Aïmane -> Aimane #>
    param([string]$Texte)
    $normalise = $Texte.Normalize([Text.NormalizationForm]::FormD)
    $sb = [Text.StringBuilder]::new()
    foreach ($c in $normalise.ToCharArray()) {
        if ([Globalization.CharUnicodeInfo]::GetUnicodeCategory($c) -ne [Globalization.UnicodeCategory]::NonSpacingMark) {
            [void]$sb.Append($c)
        }
    }
    $sb.ToString()
}

function New-MotDePasse {
    <# 16 caractères, 4 familles garanties. #>
    $maj = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; $min = 'abcdefghijkmnpqrstuvwxyz'
    $chi = '23456789';                $spe = '!@#$%*?+='
    $obligatoires = @($maj, $min, $chi, $spe) | ForEach-Object { $_[(Get-Random -Maximum $_.Length)] }
    $tout = $maj + $min + $chi + $spe
    $reste = 1..12 | ForEach-Object { $tout[(Get-Random -Maximum $tout.Length)] }
    -join (($obligatoires + $reste) | Sort-Object { Get-Random })
}

# --- Contrôles préalables ------------------------------------------------

try {
    Get-ADOrganizationalUnit -Identity $TargetOU | Out-Null
}
catch {
    throw "L'unité d'organisation de destination est introuvable : $TargetOU"
}

$lignes = Import-Csv -Path $CsvPath -Delimiter $Delimiter
if (-not $lignes) { throw "Le fichier CSV est vide : $CsvPath" }

$colonnesRequises = @('Prenom', 'Nom', 'Service', 'Fonction')
$colonnesPresentes = $lignes[0].PSObject.Properties.Name
$manquantes = $colonnesRequises | Where-Object { $_ -notin $colonnesPresentes }
if ($manquantes) {
    throw "Colonnes manquantes dans le CSV : $($manquantes -join ', ')"
}

Write-Journal "Source : $CsvPath ($($lignes.Count) lignes)"
Write-Journal "Destination : $TargetOU"

# --- Traitement ----------------------------------------------------------

$creees = 0; $ignorees = 0; $erreurs = 0
$mdpCollectes = [System.Collections.Generic.List[object]]::new()

foreach ($ligne in $lignes) {

    if ([string]::IsNullOrWhiteSpace($ligne.Prenom) -or [string]::IsNullOrWhiteSpace($ligne.Nom)) {
        Write-Journal "Ligne ignorée : prénom ou nom vide." 'ERREUR'
        $erreurs++
        continue
    }

    $prenom = $ligne.Prenom.Trim()
    $nom    = $ligne.Nom.Trim()

    # Construction du SamAccountName, avec dédoublonnage
    $base = ("{0}.{1}" -f (ConvertTo-Ascii $prenom).Substring(0, 1), (ConvertTo-Ascii $nom)).ToLower() -replace '[^a-z0-9._-]', ''
    if ($base.Length -gt 20) { $base = $base.Substring(0, 20) }

    $sam = $base; $suffixe = 2
    while (Get-ADUser -Filter "SamAccountName -eq '$sam'" -ErrorAction SilentlyContinue) {
        if ($suffixe -eq 2) { Write-Journal "Homonyme détecté pour $base" 'IGNORE' }
        $sam = "{0}{1}" -f $base, $suffixe
        $suffixe++
        if ($suffixe -gt 99) { throw "Trop d'homonymes pour $base" }
    }

    if ($sam -ne $base) {
        Write-Journal "$prenom $nom : identifiant attribué $sam (homonyme)" 'IGNORE'
    }

    $nomComplet = "$prenom $nom"
    $upn        = "$sam@$Domain"
    $motDePasse = New-MotDePasse

    if ($PSCmdlet.ShouldProcess($nomComplet, "Créer le compte $sam")) {
        try {
            New-ADUser `
                -Name                 $nomComplet `
                -GivenName            $prenom `
                -Surname              $nom `
                -DisplayName          $nomComplet `
                -SamAccountName       $sam `
                -UserPrincipalName    $upn `
                -Path                 $TargetOU `
                -Department           $ligne.Service `
                -Title                $ligne.Fonction `
                -AccountPassword      (ConvertTo-SecureString $motDePasse -AsPlainText -Force) `
                -ChangePasswordAtLogon $true `
                -Enabled              $true `
                -ErrorAction          Stop

            $mdpCollectes.Add([pscustomobject]@{
                Nom            = $nomComplet
                SamAccountName = $sam
                UPN            = $upn
                MotDePasse     = $motDePasse
            })

            Write-Journal "Créé : $nomComplet ($sam)" 'OK'
            $creees++
        }
        catch {
            Write-Journal "Échec pour $nomComplet : $($_.Exception.Message)" 'ERREUR'
            $erreurs++
        }
    }
    else {
        Write-Journal "[simulation] Serait créé : $nomComplet ($sam) — $upn" 'INFO'
        $ignorees++
    }
}

# --- Restitution ---------------------------------------------------------

if ($mdpCollectes.Count -gt 0) {
    $mdpCollectes | Export-Csv -Path $fichierMdp -NoTypeInformation -Encoding UTF8
    Write-Journal "Mots de passe initiaux : $fichierMdp" 'INFO'
    Write-Host ""
    Write-Warning "Ce fichier contient des mots de passe en clair. Transmettez-les par un canal distinct, puis supprimez-le."
}

Write-Host ""
Write-Host "=== Synthèse ===" -ForegroundColor Cyan
Write-Host ("Comptes créés   : {0}" -f $creees)
Write-Host ("Simulés/ignorés : {0}" -f $ignorees)
Write-Host ("Erreurs         : {0}" -f $erreurs)
Write-Host ("Journal         : {0}" -f $journal)
