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
 * Retourne la date et l'heure courante au format YYYY-MM-DDTHH:mm
 * dans le fuseau horaire d'Antananarivo (UTC+3) pour les champs datetime-local.
 */
export function nowDateTimeString(): string {
  const local = new Date(
    new Date().toLocaleString("en-US", { timeZone: TZ_ANTANANARIVO })
  );
  const year = local.getFullYear();
  const month = String(local.getMonth() + 1).padStart(2, "0");
  const day = String(local.getDate()).padStart(2, "0");
  const hours = String(local.getHours()).padStart(2, "0");
  const minutes = String(local.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Convertit une chaîne YYYY-MM-DD ou YYYY-MM-DDTHH:mm saisie par l'utilisateur
 * en objet Date dans le fuseau d'Antananarivo (UTC+3), stocké en UTC dans la BDD.
 */
export function localDateToUTC(dateStr: string): Date {
  // Si le format contient l'heure (ex: "2026-11-10T15:30" ou "2026-11-10T15:30:00")
  if (dateStr.includes("T")) {
    const parts = dateStr.split("T");
    const d = parts[0];
    let t = parts[1];
    if (t.length === 5) t = `${t}:00`;
    return new Date(`${d}T${t}+03:00`);
  }

  // Si c'est juste "YYYY-MM-DD"
  const today = todayString();
  if (dateStr === today) {
    // Si la date choisie est aujourd'hui, on associe automatiquement l'heure courante d'Antananarivo
    const localNow = new Date(
      new Date().toLocaleString("en-US", { timeZone: TZ_ANTANANARIVO })
    );
    const hours = String(localNow.getHours()).padStart(2, "0");
    const minutes = String(localNow.getMinutes()).padStart(2, "0");
    const seconds = String(localNow.getSeconds()).padStart(2, "0");
    return new Date(`${dateStr}T${hours}:${minutes}:${seconds}+03:00`);
  }

  // Pour une date passée sans heure spécifiée, on positionne à 12:00:00 (midi)
  return new Date(`${dateStr}T12:00:00+03:00`);
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
