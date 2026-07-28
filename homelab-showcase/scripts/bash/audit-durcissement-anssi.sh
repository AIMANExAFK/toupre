#!/usr/bin/env bash
#
# audit-durcissement-anssi.sh
#
# Contrôle la configuration d'un hôte GNU/Linux au regard des recommandations
# d'hygiène de l'ANSSI (guide de durcissement BP-028).
#
# Lecture seule : le script ne modifie jamais le système, il constate et propose.
#
# Codes de sortie :
#   0  aucun écart bloquant
#   1  au moins un écart de niveau ÉLEVÉ
#   2  erreur d'exécution
#
# Auteur : Aïmane Ramzi
#
set -uo pipefail

VERSION="1.2"
FORMAT="texte"
VERBEUX=0

# --- Couleurs (désactivées hors terminal) --------------------------------
if [[ -t 1 ]]; then
    ROUGE=$'\033[0;31m'; VERT=$'\033[0;32m'; JAUNE=$'\033[0;33m'
    BLEU=$'\033[0;34m';  GRAS=$'\033[1m';    RAZ=$'\033[0m'
else
    ROUGE=""; VERT=""; JAUNE=""; BLEU=""; GRAS=""; RAZ=""
fi

NB_OK=0; NB_MOYEN=0; NB_ELEVE=0
declare -a ECARTS=()

usage() {
    cat <<EOF
Usage : $(basename "$0") [options]

  -j, --json      Sortie au format JSON (exploitable par une chaîne CI)
  -v, --verbose   Affiche aussi les contrôles conformes
  -h, --help      Cette aide

Exemples :
  sudo ./$(basename "$0")
  sudo ./$(basename "$0") --json > rapport.json
EOF
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        -j|--json)    FORMAT="json"; shift ;;
        -v|--verbose) VERBEUX=1; shift ;;
        -h|--help)    usage; exit 0 ;;
        *) echo "Option inconnue : $1" >&2; usage; exit 2 ;;
    esac
done

# --- Moteur de contrôle ---------------------------------------------------
#
# controle <gravite> <intitule> <constat> <recommandation> <conforme:0|1>
#
controle() {
    local gravite="$1" intitule="$2" constat="$3" reco="$4" conforme="$5"

    if [[ "$conforme" -eq 1 ]]; then
        NB_OK=$((NB_OK + 1))
        if [[ "$VERBEUX" -eq 1 && "$FORMAT" == "texte" ]]; then
            printf '  %s[ OK ]%s %s\n' "$VERT" "$RAZ" "$intitule"
        fi
        return
    fi

    case "$gravite" in
        ELEVE) NB_ELEVE=$((NB_ELEVE + 1)); local coul="$ROUGE" ;;
        *)     NB_MOYEN=$((NB_MOYEN + 1)); local coul="$JAUNE" ;;
    esac

    ECARTS+=("$(printf '{"gravite":"%s","controle":"%s","constat":"%s","recommandation":"%s"}' \
        "$gravite" "$intitule" "$constat" "$reco")")

    if [[ "$FORMAT" == "texte" ]]; then
        printf '  %s[%s]%s %s\n' "$coul" "$gravite" "$RAZ" "$intitule"
        printf '         constat : %s\n' "$constat"
        printf '         action  : %s\n' "$reco"
    fi
}

titre() {
    [[ "$FORMAT" == "texte" ]] && printf '\n%s%s%s\n' "$GRAS$BLEU" "$1" "$RAZ"
    return 0
}

# --- Lecture d'un paramètre sshd ------------------------------------------
# Prend la dernière occurrence non commentée, comme le fait sshd.
lire_sshd() {
    local cle="$1" fichier="/etc/ssh/sshd_config"
    [[ -r "$fichier" ]] || { echo ""; return; }
    grep -Ei "^[[:space:]]*${cle}[[:space:]]+" "$fichier" 2>/dev/null \
        | tail -n 1 | awk '{print tolower($2)}'
}

# =========================================================================
[[ "$FORMAT" == "texte" ]] && {
    printf '%s' "$GRAS"
    echo "Audit de durcissement — recommandations ANSSI (BP-028)"
    printf '%s' "$RAZ"
    echo "Hôte : $(hostname)  ·  $(date '+%d/%m/%Y %H:%M')  ·  version $VERSION"
    [[ $EUID -ne 0 ]] && echo "${JAUNE}Note : exécution sans privilèges, certains contrôles seront incomplets.${RAZ}"
}

# --- 1. Service SSH -------------------------------------------------------
titre "1. Service SSH"

if [[ -r /etc/ssh/sshd_config ]]; then

    v=$(lire_sshd "PermitRootLogin")
    [[ -z "$v" ]] && v="(défaut)"
    conforme=0; [[ "$v" == "no" ]] && conforme=1
    controle "ELEVE" "Connexion SSH directe de root" \
        "PermitRootLogin = $v" \
        "Positionner 'PermitRootLogin no' et passer par un compte nominatif puis sudo" "$conforme"

    v=$(lire_sshd "PasswordAuthentication")
    [[ -z "$v" ]] && v="(défaut : yes)"
    conforme=0; [[ "$v" == "no" ]] && conforme=1
    controle "MOYEN" "Authentification SSH par mot de passe" \
        "PasswordAuthentication = $v" \
        "Préférer l'authentification par clé et positionner 'PasswordAuthentication no'" "$conforme"

    v=$(lire_sshd "PermitEmptyPasswords")
    [[ -z "$v" ]] && v="no"
    conforme=0; [[ "$v" == "no" ]] && conforme=1
    controle "ELEVE" "Mots de passe vides autorisés en SSH" \
        "PermitEmptyPasswords = $v" \
        "Positionner 'PermitEmptyPasswords no'" "$conforme"

    v=$(lire_sshd "X11Forwarding")
    [[ -z "$v" ]] && v="no"
    conforme=0; [[ "$v" == "no" ]] && conforme=1
    controle "MOYEN" "Redirection X11 en SSH" \
        "X11Forwarding = $v" \
        "Désactiver si aucune application graphique distante n'est nécessaire" "$conforme"
else
    controle "MOYEN" "Configuration SSH" "/etc/ssh/sshd_config illisible ou absent" \
        "Vérifier l'installation d'OpenSSH si le service est attendu" 0
fi

# --- 2. Paramètres réseau du noyau ---------------------------------------
titre "2. Paramètres réseau du noyau"

verifier_sysctl() {
    local cle="$1" attendu="$2" gravite="$3" libelle="$4" reco="$5"
    local actuel
    actuel=$(sysctl -n "$cle" 2>/dev/null) || {
        controle "$gravite" "$libelle" "paramètre $cle indisponible" "$reco" 0
        return
    }
    local conforme=0; [[ "$actuel" == "$attendu" ]] && conforme=1
    controle "$gravite" "$libelle" "$cle = $actuel (attendu $attendu)" "$reco" "$conforme"
}

verifier_sysctl "net.ipv4.ip_forward" "0" "MOYEN" \
    "Routage IP activé" "Désactiver si l'hôte n'est pas routeur : net.ipv4.ip_forward = 0"

verifier_sysctl "net.ipv4.conf.all.accept_redirects" "0" "MOYEN" \
    "Acceptation des redirections ICMP" "net.ipv4.conf.all.accept_redirects = 0"

verifier_sysctl "net.ipv4.conf.all.accept_source_route" "0" "ELEVE" \
    "Routage par la source accepté" "net.ipv4.conf.all.accept_source_route = 0"

verifier_sysctl "net.ipv4.conf.all.rp_filter" "1" "MOYEN" \
    "Filtrage par chemin inverse" "Activer l'anti-usurpation : net.ipv4.conf.all.rp_filter = 1"

verifier_sysctl "net.ipv4.tcp_syncookies" "1" "MOYEN" \
    "Protection contre les inondations SYN" "net.ipv4.tcp_syncookies = 1"

verifier_sysctl "kernel.randomize_va_space" "2" "MOYEN" \
    "Randomisation de l'espace d'adressage (ASLR)" "kernel.randomize_va_space = 2"

# --- 3. Permissions des fichiers sensibles -------------------------------
titre "3. Permissions des fichiers sensibles"

verifier_permissions() {
    local fichier="$1" attendu="$2" gravite="$3"
    if [[ ! -e "$fichier" ]]; then
        return
    fi
    local actuel
    actuel=$(stat -c '%a' "$fichier" 2>/dev/null) || return
    local conforme=0; [[ "$actuel" == "$attendu" ]] && conforme=1
    controle "$gravite" "Permissions de $fichier" \
        "mode $actuel (attendu $attendu)" \
        "chmod $attendu $fichier" "$conforme"
}

verifier_permissions "/etc/shadow"  "640" "ELEVE"
verifier_permissions "/etc/gshadow" "640" "ELEVE"
verifier_permissions "/etc/passwd"  "644" "MOYEN"
verifier_permissions "/etc/group"   "644" "MOYEN"

# Fichiers accessibles en écriture à tous (hors /proc, /sys, /tmp)
if [[ $EUID -eq 0 ]]; then
    nb_ww=$(find / -xdev -type f -perm -0002 \
        -not -path '/proc/*' -not -path '/sys/*' -not -path '/tmp/*' \
        2>/dev/null | wc -l)
    conforme=0; [[ "$nb_ww" -eq 0 ]] && conforme=1
    controle "ELEVE" "Fichiers modifiables par tout utilisateur" \
        "$nb_ww fichier(s) en écriture universelle" \
        "Lister avec : find / -xdev -type f -perm -0002 puis retirer le bit d'écriture" "$conforme"
fi

# --- 4. Comptes et authentification --------------------------------------
titre "4. Comptes et authentification"

# Comptes sans mot de passe
if [[ -r /etc/shadow ]]; then
    sans_mdp=$(awk -F: '($2 == "") {print $1}' /etc/shadow 2>/dev/null | tr '\n' ' ')
    conforme=1; [[ -n "${sans_mdp// /}" ]] && conforme=0
    controle "ELEVE" "Comptes sans mot de passe" \
        "${sans_mdp:-aucun}" \
        "Verrouiller les comptes concernés : passwd -l <compte>" "$conforme"
fi

# Comptes non-root avec UID 0
uid0=$(awk -F: '($3 == 0 && $1 != "root") {print $1}' /etc/passwd 2>/dev/null | tr '\n' ' ')
conforme=1; [[ -n "${uid0// /}" ]] && conforme=0
controle "ELEVE" "Comptes disposant de l'UID 0" \
    "${uid0:-aucun (seul root)}" \
    "Aucun compte hors root ne doit porter l'UID 0" "$conforme"

# Durée de vie des mots de passe
if [[ -r /etc/login.defs ]]; then
    max=$(awk '/^PASS_MAX_DAYS/ {print $2}' /etc/login.defs | tail -n1)
    max=${max:-99999}
    conforme=0; [[ "$max" -le 90 ]] && conforme=1
    controle "MOYEN" "Durée de vie maximale des mots de passe" \
        "PASS_MAX_DAYS = $max" \
        "Ramener à 90 jours ou moins dans /etc/login.defs" "$conforme"
fi

# --- 5. Filtrage et services ---------------------------------------------
titre "5. Filtrage et services"

pare_feu="aucun"
if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -qi '^Status: active'; then
    pare_feu="ufw actif"
elif command -v firewall-cmd >/dev/null 2>&1 && firewall-cmd --state 2>/dev/null | grep -qi running; then
    pare_feu="firewalld actif"
elif command -v nft >/dev/null 2>&1 && [[ -n "$(nft list ruleset 2>/dev/null)" ]]; then
    pare_feu="nftables — règles présentes"
elif command -v iptables >/dev/null 2>&1 && [[ "$(iptables -S 2>/dev/null | wc -l)" -gt 3 ]]; then
    pare_feu="iptables — règles présentes"
fi
conforme=0; [[ "$pare_feu" != "aucun" ]] && conforme=1
controle "ELEVE" "Pare-feu local" "$pare_feu" \
    "Activer un filtrage local en refus par défaut sur les flux entrants" "$conforme"

# Ports en écoute sur toutes les interfaces
if command -v ss >/dev/null 2>&1; then
    nb_ports=$(ss -tlnH 2>/dev/null | awk '{print $4}' | grep -Ec '^(0\.0\.0\.0|\*|\[::\]):' || true)
    conforme=0; [[ "${nb_ports:-0}" -le 2 ]] && conforme=1
    controle "MOYEN" "Services exposés sur toutes les interfaces" \
        "${nb_ports:-0} port(s) en écoute sur 0.0.0.0 ou [::]" \
        "Restreindre chaque service à l'interface strictement nécessaire" "$conforme"
fi

# --- 6. Journalisation et mises à jour -----------------------------------
titre "6. Journalisation et mises à jour"

journal_actif=0
if command -v systemctl >/dev/null 2>&1; then
    systemctl is-active --quiet systemd-journald 2>/dev/null && journal_actif=1
    systemctl is-active --quiet rsyslog 2>/dev/null && journal_actif=1
fi
controle "MOYEN" "Service de journalisation" \
    "$([[ $journal_actif -eq 1 ]] && echo 'actif' || echo 'inactif ou indéterminé')" \
    "Assurer la journalisation locale et son export vers un collecteur (SIEM)" "$journal_actif"

if command -v apt-get >/dev/null 2>&1; then
    maj=$(apt-get -s upgrade 2>/dev/null | grep -c '^Inst ' || true)
    conforme=0; [[ "${maj:-0}" -eq 0 ]] && conforme=1
    controle "MOYEN" "Mises à jour en attente" \
        "${maj:-0} paquet(s) à mettre à jour" \
        "Appliquer les correctifs, en priorité ceux de sécurité" "$conforme"
fi

# --- Restitution ----------------------------------------------------------
TOTAL=$((NB_OK + NB_MOYEN + NB_ELEVE))
if [[ "$TOTAL" -gt 0 ]]; then
    SCORE=$(( NB_OK * 100 / TOTAL ))
else
    SCORE=0
fi

if [[ "$FORMAT" == "json" ]]; then
    printf '{\n'
    printf '  "hote": "%s",\n' "$(hostname)"
    printf '  "date": "%s",\n' "$(date -Iseconds)"
    printf '  "score": %d,\n' "$SCORE"
    printf '  "conformes": %d,\n' "$NB_OK"
    printf '  "ecarts_moyens": %d,\n' "$NB_MOYEN"
    printf '  "ecarts_eleves": %d,\n' "$NB_ELEVE"
    printf '  "ecarts": [%s]\n' "$(IFS=,; echo "${ECARTS[*]:-}")"
    printf '}\n'
else
    echo
    printf '%s' "$GRAS"
    echo "──────────────── Synthèse ────────────────"
    printf '%s' "$RAZ"
    printf '  Conformes      : %s%d%s\n' "$VERT"  "$NB_OK"    "$RAZ"
    printf '  Écarts moyens  : %s%d%s\n' "$JAUNE" "$NB_MOYEN" "$RAZ"
    printf '  Écarts élevés  : %s%d%s\n' "$ROUGE" "$NB_ELEVE" "$RAZ"
    printf '  Score          : %d%% (%d/%d)\n' "$SCORE" "$NB_OK" "$TOTAL"
    echo
    if [[ "$NB_ELEVE" -gt 0 ]]; then
        echo "${ROUGE}Des écarts de niveau élevé doivent être traités en priorité.${RAZ}"
    elif [[ "$NB_MOYEN" -gt 0 ]]; then
        echo "${JAUNE}Aucun écart bloquant. Écarts moyens à planifier.${RAZ}"
    else
        echo "${VERT}Aucun écart détecté sur le périmètre contrôlé.${RAZ}"
    fi
fi

[[ "$NB_ELEVE" -gt 0 ]] && exit 1
exit 0
