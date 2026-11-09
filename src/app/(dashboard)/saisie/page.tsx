// ─────────────────────────────────────────────────────────────
// Page Saisie — Écran principal de saisie des mouvements
// Route : /saisie   (groupe (dashboard))
//
// Server Component : charge la liste des produits actifs depuis la BDD.
// Le formulaire lui-même est un Client Component (MouvementForm).
// ─────────────────────────────────────────────────────────────

import { prisma } from "@/lib/prisma";
import { SaisieClient } from "./SaisieClient";

export const dynamic = "force-dynamic";

/** Charge tous les produits actifs avec leur chemin catégorie complet. */
async function getProduits() {
  const produits = await prisma.produit.findMany({
    where: { actif: true },
    orderBy: { nom: "asc" },
    include: {
      categorie: {
        select: {
          nom: true,
          parent: { select: { nom: true } },
        },
      },
    },
  });

  return produits.map((p) => ({
    id: p.id,
    nom: p.nom,
    unite: p.unite,
    chemin: [p.categorie.parent?.nom, p.categorie.nom, p.nom]
      .filter(Boolean)
      .join(" › "),
  }));
}

export default async function SaisiePage() {
  const produits = await getProduits();

  return (
    <main className="min-h-screen bg-gray-50 py-6">
      <SaisieClient produits={produits} />
    </main>
  );
}
