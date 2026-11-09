// ─────────────────────────────────────────────────────────────
// Page de Connexion – Server Component
// Route : /login
// ─────────────────────────────────────────────────────────────

import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Connexion – StockTracker",
  description: "Accès sécurisé à l'application de suivi de stock",
};

export default async function LoginPage() {
  const session = await getSession();

  // Si déjà connecté, rediriger vers le tableau de bord
  if (session) {
    redirect("/");
  }

  return (
    <main className="min-h-[calc(100vh-140px)] flex items-center justify-center px-4 py-12">
      <LoginForm />
    </main>
  );
}
