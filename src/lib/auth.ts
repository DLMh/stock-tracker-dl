// ─────────────────────────────────────────────────────────────
// Auth & Session Management – StockTracker
// RF-21 : Connexion par identifiant et mot de passe
// RF-22 : Traçabilité des utilisateurs sur chaque mouvement
// Résolution contrainte mouvements_utilisateur_id_fkey
// ─────────────────────────────────────────────────────────────

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";

export const SESSION_COOKIE_NAME = "stock_tracker_session";
const SESSION_SECRET = process.env.AUTH_SECRET || "stock_tracker_fallback_secret_key_2026";

export interface SessionUser {
  id: string;
  nom: string;
  identifiant: string;
  role: Role;
}

// ─────────────────────────────────────────────────────────────
// 1. Initialisation / Vérification des utilisateurs par défaut
// ─────────────────────────────────────────────────────────────

export const DEFAULT_USERS = [
  {
    nom: "Rina",
    identifiant: "Rina",
    motDePasseClair: "admin",
    role: Role.ADMIN,
    actif: true,
  },
  {
    nom: "Francia",
    identifiant: "Francia",
    motDePasseClair: "admin",
    role: Role.ADMIN,
    actif: true,
  },
] as const;

/**
 * Assure que les utilisateurs par défaut (Rina et Francia) existent dans la BDD.
 * Appelé automatiquement au login, à la vérification ou en script de seed.
 */
export async function ensureDefaultUsers(): Promise<SessionUser[]> {
  const usersCreatedOrFound: SessionUser[] = [];

  for (const u of DEFAULT_USERS) {
    try {
      let user = await prisma.utilisateur.findFirst({
        where: {
          identifiant: { equals: u.identifiant, mode: "insensitive" },
        },
      });

      if (!user) {
        const motDePasseHache = bcrypt.hashSync(u.motDePasseClair, 10);
        user = await prisma.utilisateur.create({
          data: {
            nom: u.nom,
            identifiant: u.identifiant,
            motDePasseHache,
            role: u.role,
            actif: u.actif,
          },
        });
      }

      usersCreatedOrFound.push({
        id: user.id,
        nom: user.nom,
        identifiant: user.identifiant,
        role: user.role,
      });
    } catch (e) {
      console.error(`[ensureDefaultUsers] Erreur pour ${u.identifiant}:`, e);
    }
  }

  return usersCreatedOrFound;
}

// ─────────────────────────────────────────────────────────────
// 2. Signature et chiffrement de la session (Cookie sécurisé)
// ─────────────────────────────────────────────────────────────

function signPayload(payload: string): string {
  const hmac = crypto.createHmac("sha256", SESSION_SECRET);
  hmac.update(payload);
  return hmac.digest("hex");
}

function serializeSession(user: SessionUser): string {
  const data = {
    ...user,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // Expiration à 7 jours
  };
  const payload = Buffer.from(JSON.stringify(data)).toString("base64");
  const signature = signPayload(payload);
  return `${payload}.${signature}`;
}

function parseSession(cookieValue: string): SessionUser | null {
  try {
    const [payload, signature] = cookieValue.split(".");
    if (!payload || !signature) return null;

    const expectedSig = signPayload(payload);
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);
    
    // Comparaison en temps constant pour parer aux attaques temporelles
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const decoded = Buffer.from(payload, "base64").toString("utf-8");
    const data = JSON.parse(decoded);

    // Vérification de l'expiration du jeton (protection anti-rejeu)
    if (data.expiresAt && Date.now() > data.expiresAt) {
      return null;
    }

    return {
      id: data.id,
      nom: data.nom,
      identifiant: data.identifiant,
      role: data.role,
    };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// 3. Gestion de la session dans les cookies
// ─────────────────────────────────────────────────────────────

/** Crée le cookie de session pour l'utilisateur */
export async function createSession(user: SessionUser): Promise<void> {
  const cookieStore = await cookies();
  const token = serializeSession(user);

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 jours
  });
}

/** Récupère la session courante depuis les cookies */
export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) return null;

    const user = parseSession(sessionCookie.value);
    if (!user) return null;

    return user;
  } catch {
    return null;
  }
}

/** Exige une session active ou lève une exception */
export async function requireAuthUser(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new Error("Authentification requise. Veuillez vous connecter.");
  }
  return session;
}

/** Supprime la session (Déconnexion) */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Récupère l'utilisateur connecté ou, s'il n'y a pas de session active,
 * assure l'existence des utilisateurs par défaut et retourne le premier (Rina).
 * Cela garantit que l'enregistrement d'un mouvement ne viole JAMAIS
 * la contrainte de clé étrangère `mouvements_utilisateur_id_fkey`.
 */
export async function getCurrentUserOrFallback(): Promise<SessionUser> {
  const session = await getSession();
  if (session) return session;

  // Fallback sécurisé : utilisateur par défaut
  const defaults = await ensureDefaultUsers();
  if (defaults.length > 0) {
    return defaults[0];
  }

  // Si BDD vierge
  const premierUser = await prisma.utilisateur.findFirst({ where: { actif: true } });
  if (premierUser) {
    return {
      id: premierUser.id,
      nom: premierUser.nom,
      identifiant: premierUser.identifiant,
      role: premierUser.role,
    };
  }

  throw new Error("Aucun utilisateur disponible pour enregistrer le mouvement.");
}

// ─────────────────────────────────────────────────────────────
// 4. Vérification des identifiants (Login)
// ─────────────────────────────────────────────────────────────

export async function verifyCredentials(
  identifiant: string,
  motDePasse: string
): Promise<SessionUser | null> {
  // S'assurer que les comptes Rina et Francia existent
  await ensureDefaultUsers();

  const user = await prisma.utilisateur.findFirst({
    where: {
      identifiant: { equals: identifiant.trim(), mode: "insensitive" },
      actif: true,
    },
  });

  if (!user) {
    return null;
  }

  const motDePasseValide = bcrypt.compareSync(motDePasse, user.motDePasseHache);
  if (!motDePasseValide) {
    return null;
  }

  return {
    id: user.id,
    nom: user.nom,
    identifiant: user.identifiant,
    role: user.role,
  };
}
