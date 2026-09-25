import { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors, spacing, radius } from "./theme";

// Calendrier mensuel maison (spec 005). Aucune dépendance : la grille est
// simple, et un composant local reste cohérent avec le thème de l'application.
//
// Deux usages :
//   mode="plage"   → le locataire choisit ses dates ; les jours indisponibles
//                    ne sont pas sélectionnables, ni traversables par une plage.
//   mode="bascule" → le propriétaire ouvre ou ferme un jour d'un simple appui.

export function jourISO(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const j = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${j}`;
}

export function depuisISO(s: string): Date {
  const [a, m, j] = s.split("-").map(Number);
  return new Date(a, m - 1, j);
}

/** Tous les jours de debut à fin inclus, au format AAAA-MM-JJ. */
export function joursEntre(debut: string, fin: string): string[] {
  const out: string[] = [];
  const d = depuisISO(debut);
  const f = depuisISO(fin);
  while (d <= f) {
    out.push(jourISO(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

const MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];
const JOURS = ["L", "M", "M", "J", "V", "S", "D"];

type Props = {
  /** Jours non réservables, format AAAA-MM-JJ. */
  indisponibles: string[];
  mode?: "plage" | "bascule";
  debut?: string | null;
  fin?: string | null;
  onPlage?: (debut: string, fin: string | null) => void;
  onBascule?: (jour: string) => void;
  /** En mode bascule : jours fermés par le propriétaire (modifiables). */
  fermes?: string[];
  /** Nombre de mois consultables vers l'avant. */
  moisMax?: number;
};

export function Calendrier({
  indisponibles, mode = "plage", debut, fin, onPlage, onBascule, fermes = [], moisMax = 12,
}: Props) {
  const colors = useColors();
  const aujourdhui = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const [curseur, setCurseur] = useState(() => new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1));

  const pris = useMemo(() => new Set(indisponibles), [indisponibles]);
  const closSet = useMemo(() => new Set(fermes), [fermes]);
  const selection = useMemo(
    () => (debut && fin ? new Set(joursEntre(debut, fin)) : new Set(debut ? [debut] : [])),
    [debut, fin],
  );

  const limite = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() + moisMax, 1);
  const peutReculer = curseur > new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1);
  const peutAvancer = curseur < limite;

  const cellules = useMemo(() => {
    const premier = new Date(curseur.getFullYear(), curseur.getMonth(), 1);
    // getDay() : 0 = dimanche. La semaine française commence le lundi.
    const decalage = (premier.getDay() + 6) % 7;
    const nbJours = new Date(curseur.getFullYear(), curseur.getMonth() + 1, 0).getDate();
    const out: (Date | null)[] = Array(decalage).fill(null);
    for (let j = 1; j <= nbJours; j++) out.push(new Date(curseur.getFullYear(), curseur.getMonth(), j));
    return out;
  }, [curseur]);

  const appui = (d: Date) => {
    const iso = jourISO(d);
    if (mode === "bascule") { onBascule?.(iso); return; }
    if (!onPlage) return;
    // Premier appui, ou nouvel appui après une plage complète, ou appui avant le
    // début déjà posé : on repart de ce jour.
    if (!debut || fin || iso < debut) { onPlage(iso, null); return; }
    if (iso === debut) { onPlage(iso, iso); return; }
    // Une plage ne peut pas enjamber un jour pris : on redémarre plutôt que de
    // proposer une sélection que le serveur refusera.
    const traverse = joursEntre(debut, iso).some((j) => pris.has(j));
    onPlage(traverse ? iso : debut, traverse ? null : iso);
  };

  return (
    <View testID="calendrier">
      <View style={styles.barre}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Mois précédent"
          accessibilityState={{ disabled: !peutReculer }}
          disabled={!peutReculer}
          onPress={() => setCurseur(new Date(curseur.getFullYear(), curseur.getMonth() - 1, 1))}
          testID="cal-prev"
          style={styles.fleche}
        >
          <Ionicons name="chevron-back" size={20} color={peutReculer ? colors.textPrimary : colors.textTertiary} />
        </TouchableOpacity>
        <Text style={[styles.mois, { color: colors.textPrimary }]} testID="cal-mois">
          {MOIS[curseur.getMonth()]} {curseur.getFullYear()}
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Mois suivant"
          accessibilityState={{ disabled: !peutAvancer }}
          disabled={!peutAvancer}
          onPress={() => setCurseur(new Date(curseur.getFullYear(), curseur.getMonth() + 1, 1))}
          testID="cal-next"
          style={styles.fleche}
        >
          <Ionicons name="chevron-forward" size={20} color={peutAvancer ? colors.textPrimary : colors.textTertiary} />
        </TouchableOpacity>
      </View>

      <View style={styles.semaine}>
        {JOURS.map((j, i) => (
          <Text key={i} style={[styles.entete, { color: colors.textTertiary }]}>{j}</Text>
        ))}
      </View>

      <View style={styles.grille}>
        {cellules.map((d, i) => {
          if (!d) return <View key={`v${i}`} style={styles.case} />;
          const iso = jourISO(d);
          const passe = d < aujourdhui;
          const indispo = pris.has(iso);
          const ferme = closSet.has(iso);
          const choisi = selection.has(iso);
          // En mode bascule, un jour fermé par le propriétaire reste cliquable
          // pour être rouvert ; un jour réservé, non.
          const inerte = passe || (mode === "plage" ? indispo : indispo && !ferme);

          const fond = choisi ? colors.primary : ferme ? colors.surface2 : "transparent";
          const teinte = choisi
            ? colors.textInverse
            : inerte
              ? colors.textTertiary
              : colors.textPrimary;

          return (
            <TouchableOpacity
              key={iso}
              accessibilityRole="button"
              accessibilityLabel={
                `${d.getDate()} ${MOIS[d.getMonth()]}` +
                (inerte ? ", indisponible" : ferme ? ", fermé, appuyez pour rouvrir" : choisi ? ", sélectionné" : "")
              }
              accessibilityState={{ disabled: inerte, selected: choisi }}
              disabled={inerte}
              onPress={() => appui(d)}
              testID={`cal-${iso}`}
              style={[styles.case, { backgroundColor: fond }]}
            >
              <Text style={[styles.chiffre, { color: teinte }, inerte && styles.barre_]}>
                {d.getDate()}
              </Text>
              {(indispo || ferme) && !choisi && (
                <View style={[styles.point, { backgroundColor: ferme ? colors.warning : colors.error }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.legende}>
        <Legende couleur={colors.error} texte="Déjà réservé" />
        {mode === "bascule" && <Legende couleur={colors.warning} texte="Fermé par vous" />}
        <Legende couleur={colors.primary} texte={mode === "bascule" ? "Ouvert" : "Vos dates"} plein />
      </View>
    </View>
  );
}

function Legende({ couleur, texte, plein }: { couleur: string; texte: string; plein?: boolean }) {
  const colors = useColors();
  return (
    <View style={styles.legItem}>
      <View style={[
        plein ? styles.legCarre : styles.legPoint,
        { backgroundColor: couleur },
      ]} />
      <Text style={[styles.legTxt, { color: colors.textSecondary }]}>{texte}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  barre: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  fleche: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  mois: { fontSize: 15, fontWeight: "600", textTransform: "capitalize" },
  semaine: { flexDirection: "row" },
  entete: { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "600", paddingVertical: 4 },
  grille: { flexDirection: "row", flexWrap: "wrap" },
  case: {
    width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center",
    borderRadius: radius.sm,
  },
  chiffre: { fontSize: 14, fontWeight: "700" },
  barre_: { textDecorationLine: "line-through" },
  point: { position: "absolute", bottom: 6, width: 4, height: 4, borderRadius: 2 },
  legende: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.sm, justifyContent: "center" },
  legItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legPoint: { width: 6, height: 6, borderRadius: 3 },
  legCarre: { width: 10, height: 10, borderRadius: 3 },
  legTxt: { fontSize: 11.5 },
});
