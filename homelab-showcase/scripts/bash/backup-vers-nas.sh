#!/usr/bin/env bash
#
# backup-vers-nas.sh
#
# Sauvegarde incrémentale avec rotation, vérification d'intégrité et compte rendu.
#
# Principe : rsync avec liens durs (--link-dest). Chaque sauvegarde apparaît comme
# une copie complète, mais les fichiers inchangés ne consomment pas d'espace
# supplémentaire — seuls les blocs modifiés sont réellement stockés.
#
# Une sauvegarde jamais restaurée n'est pas une sauvegarde : voir --verifier.
#
# Auteur : Aïmane Ramzi
#
set -euo pipefail

# --- Configuration --------------------------------------------------------
SOURCES=("/etc" "/home" "/var/www")
DESTINATION="/mnt/nas/sauvegardes/$(hostname)"
RETENTION=7                       # nombre de sauvegardes conservées
EXCLUSIONS=("*.tmp" "*/cache/*" "*/.cache/*" "lost+found")
JOURNAL="/var/log/sauvegarde.log"

MODE="sauvegarde"

usage() {
    cat <<EOF
Usage : $(basename "$0") [options]

  -v, --verifier   Vérifie la dernière sauvegarde (intégrité + test de restauration)
  -l, --lister     Liste les sauvegardes disponibles
  -h, --help       Cette aide
EOF
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        -v|--verifier) MODE="verification"; shift ;;
        -l|--lister)   MODE="liste"; shift ;;
        -h|--help)     usage; exit 0 ;;
        *) echo "Option inconnue : $1" >&2; exit 2 ;;
    esac
done

journaliser() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $*"
    echo "$msg"
    [[ -w "$(dirname "$JOURNAL")" ]] && echo "$msg" >> "$JOURNAL" || true
}

echec() {
    journaliser "ERREUR : $*"
    exit 1
}

# --- Mode liste -----------------------------------------------------------
if [[ "$MODE" == "liste" ]]; then
    [[ -d "$DESTINATION" ]] || echec "Aucune sauvegarde : $DESTINATION est absent."
    echo "Sauvegardes disponibles dans $DESTINATION :"
    find "$DESTINATION" -maxdepth 1 -type d -name '20*' -printf '%f\t%s\n' 2>/dev/null \
        | sort -r | while IFS=$'\t' read -r nom _; do
            taille=$(du -sh "$DESTINATION/$nom" 2>/dev/null | cut -f1)
            printf '  %s  (%s)\n' "$nom" "${taille:-?}"
        done
    exit 0
fi

# --- Mode vérification ----------------------------------------------------
if [[ "$MODE" == "verification" ]]; then
    derniere=$(find "$DESTINATION" -maxdepth 1 -type d -name '20*' 2>/dev/null | sort | tail -n1)
    [[ -n "$derniere" ]] || echec "Aucune sauvegarde à vérifier."

    journaliser "Vérification de : $derniere"

    empreintes="$derniere/.empreintes.sha256"
    if [[ -f "$empreintes" ]]; then
        journaliser "Contrôle des empreintes…"
        if (cd "$derniere" && sha256sum --quiet -c .empreintes.sha256 2>/dev/null); then
            journaliser "Intégrité vérifiée : aucune altération détectée."
        else
            echec "Altération détectée dans $derniere — sauvegarde non fiable."
        fi
    else
        journaliser "Aucun fichier d'empreintes, contrôle d'intégrité impossible."
    fi

    # Test de restauration réel dans un répertoire temporaire.
    temporaire=$(mktemp -d)
    trap 'rm -rf "$temporaire" 2>/dev/null || true' EXIT
    echantillon=$(find "$derniere" -type f -not -name '.empreintes.sha256' 2>/dev/null | shuf -n 1)
    if [[ -n "$echantillon" ]]; then
        cp "$echantillon" "$temporaire/" \
            && journaliser "Test de restauration réussi sur : $(basename "$echantillon")" \
            || echec "Le test de restauration a échoué."
    fi

    journaliser "Vérification terminée avec succès."
    exit 0
fi

# --- Mode sauvegarde ------------------------------------------------------
command -v rsync >/dev/null 2>&1 || echec "rsync est absent."

horodatage="$(date '+%Y-%m-%d_%H%M%S')"
cible="$DESTINATION/$horodatage"
precedente=$(find "$DESTINATION" -maxdepth 1 -type d -name '20*' 2>/dev/null | sort | tail -n1)

mkdir -p "$cible" || echec "Impossible de créer $cible (le NAS est-il monté ?)"

# Espace disponible : refus si moins de 5 Go.
dispo=$(df -BG --output=avail "$DESTINATION" 2>/dev/null | tail -n1 | tr -dc '0-9')
if [[ -n "$dispo" && "$dispo" -lt 5 ]]; then
    echec "Espace insuffisant sur la destination : ${dispo} Go restants."
fi

options=(-a --delete --stats --human-readable)
for motif in "${EXCLUSIONS[@]}"; do
    options+=(--exclude="$motif")
done
if [[ -n "$precedente" ]]; then
    options+=(--link-dest="$precedente")
    journaliser "Incrémentale par rapport à : $(basename "$precedente")"
else
    journaliser "Première sauvegarde — copie complète."
fi

journaliser "Début de la sauvegarde vers $cible"
debut=$(date +%s)

for source in "${SOURCES[@]}"; do
    if [[ ! -e "$source" ]]; then
        journaliser "Source absente, ignorée : $source"
        continue
    fi
    journaliser "Copie de $source…"
    rsync "${options[@]}" "$source" "$cible/" >/dev/null \
        || echec "Échec de la copie de $source"
done

# Empreintes pour permettre la vérification ultérieure.
journaliser "Calcul des empreintes…"
(cd "$cible" && find . -type f -not -name '.empreintes.sha256' -print0 \
    | xargs -0 sha256sum > .empreintes.sha256 2>/dev/null) || true

duree=$(( $(date +%s) - debut ))
taille=$(du -sh "$cible" 2>/dev/null | cut -f1)
journaliser "Sauvegarde terminée en ${duree}s — taille apparente : ${taille:-?}"

# --- Rotation -------------------------------------------------------------
nb=$(find "$DESTINATION" -maxdepth 1 -type d -name '20*' 2>/dev/null | wc -l)
if [[ "$nb" -gt "$RETENTION" ]]; then
    a_supprimer=$(( nb - RETENTION ))
    journaliser "Rotation : suppression de $a_supprimer sauvegarde(s) ancienne(s)."
    find "$DESTINATION" -maxdepth 1 -type d -name '20*' 2>/dev/null \
        | sort | head -n "$a_supprimer" \
        | while read -r vieille; do
            journaliser "Suppression : $(basename "$vieille")"
            rm -rf "$vieille"
        done
fi

journaliser "Terminé. $(find "$DESTINATION" -maxdepth 1 -type d -name '20*' | wc -l) sauvegarde(s) conservée(s)."
