// Accord du pluriel. Le motif `${n > 1 ? "s" : ""}` était recopié à chaque
// endroit, et oublié à deux : « 1 biens » sur la carte, « 8€ × 1 jours » dans
// le récapitulatif de réservation.
//
// Attention aux invariables : « avis » ne prend jamais de s. D'où le second
// paramètre, qui permet de donner la forme plurielle explicitement.
export function pluriel(n: number, singulier: string, plurielForme?: string): string {
  return n > 1 ? (plurielForme ?? `${singulier}s`) : singulier;
}

/** « 1 bien », « 3 biens » — le nombre et son mot accordé. */
export function compte(n: number, singulier: string, plurielForme?: string): string {
  return `${n} ${pluriel(n, singulier, plurielForme)}`;
}
