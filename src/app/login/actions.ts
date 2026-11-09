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
    return { error: "Erreur serveur lors de la connexion. Veuillez réessayer." };
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
