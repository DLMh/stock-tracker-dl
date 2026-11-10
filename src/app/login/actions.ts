"use server";

// ─────────────────────────────────────────────────────────────
// Server Actions – Authentification & Session
// ─────────────────────────────────────────────────────────────

import { verifyCredentials, createSession, destroySession, getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function loginAction(
  prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const identifiant = formData.get("identifiant") as string;
  const motDePasse = formData.get("motDePasse") as string;

  if (!identifiant || !motDePasse) {
    return { error: "Veuillez renseigner votre identifiant et mot de passe." };
  }

  try {
    const user = await verifyCredentials(identifiant, motDePasse);

    if (!user) {
      return {
        error: "Identifiant ou mot de passe incorrect (ou compte inactif).",
      };
    }

    // Création du cookie de session sécurisé
    await createSession(user);
  } catch (error) {
    console.error("[loginAction] Erreur :", error);

    // Diagnostic précis si la variable DATABASE_URL est absente en production
    if (!process.env.DATABASE_URL) {
      return {
        error: "Variable d'environnement DATABASE_URL manquante sur Vercel. Rendez-vous dans Vercel > Settings > Environment Variables.",
      };
    }

    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Can't reach database server") || message.includes("P1001")) {
      return {
        error: "Impossible de joindre la base de données Supabase. Utilisez l'URL du Connection Pooler (port 6543) dans les variables Vercel.",
      };
    }

    return {
      error: `Erreur serveur : ${message.slice(0, 100)}`,
    };
  }

  // Redirection vers le tableau de bord
  redirect("/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function getSessionAction() {
  return await getSession();
}
