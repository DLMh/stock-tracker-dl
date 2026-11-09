// ─────────────────────────────────────────────────────────────
// Utilitaires de fuseau horaire – RG-04
// Toutes les dates sont gérées en heure locale d'Antananarivo (UTC+3)
// ─────────────────────────────────────────────────────────────

export const TZ_ANTANANARIVO = "Indian/Antananarivo"; // UTC+3

/**
 * Retourne la date courante dans le fuseau d'Antananarivo (UTC+3).
 * À utiliser comme valeur par défaut dans les formulaires de saisie (RF-09).
 */
export function nowAntananarivo(): Date {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: TZ_ANTANANARIVO })
  );
}

/**
 * Formate une date en chaîne YYYY-MM-DD selon le fuseau d'Antananarivo.
 * Utile pour les regroupements par jour dans l'historique (RF-12).
 */
export function toLocalDateString(date: Date): string {
  return date.toLocaleDateString("fr-CA", { timeZone: TZ_ANTANANARIVO }); // "fr-CA" → YYYY-MM-DD
}

/**
 * Convertit une chaîne YYYY-MM-DD saisie par l'utilisateur en objet Date
 * représentant minuit dans le fuseau d'Antananarivo, stocké en UTC dans la BDD.
 */
export function localDateToUTC(dateStr: string): Date {
  // On interprète la date comme minuit heure locale Antananarivo
  return new Date(`${dateStr}T00:00:00+03:00`);
}

/**
 * Retourne le début de la journée (00:00:00) en UTC pour une date locale.
 */
export function startOfDayUTC(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00+03:00`);
}

/**
 * Retourne la fin de la journée (23:59:59.999) en UTC pour une date locale.
 */
export function endOfDayUTC(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59.999+03:00`);
}

/**
 * Retourne la date d'aujourd'hui au format YYYY-MM-DD en heure locale Antananarivo.
 * Valeur par défaut du champ date dans le formulaire de saisie (RF-09).
 */
export function todayString(): string {
  return toLocalDateString(new Date());
}
