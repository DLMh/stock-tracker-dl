"use client";

// ─────────────────────────────────────────────────────────────
// SaisieClient — Wrapper Client Component pour la page /saisie
//
// Rôle : connecter le formulaire MouvementForm aux Server Actions.
// La logique métier (calcul du stock, validation, enregistrement)
// reste côté serveur dans stock.service.ts.
// ─────────────────────────────────────────────────────────────

import { MouvementForm, type MouvementFormValues, type ProduitOption } from "@/components/movements/MouvementForm";
import { enregistrerMouvementAction, getStockActuelAction } from "./actions";

interface SaisieClientProps {
  produits: ProduitOption[];
}

export function SaisieClient({ produits }: SaisieClientProps) {
  async function handleSubmit(values: MouvementFormValues) {
    const result = await enregistrerMouvementAction(values);
    if (!result.success) {
      throw new Error(result.error ?? "Erreur lors de l'enregistrement.");
    }
  }

  async function handleProduitChange(produitId: string): Promise<number | null> {
    const result = await getStockActuelAction(produitId);
    return result.stockActuel ?? null;
  }

  return (
    <MouvementForm
      produits={produits}
      onSubmit={handleSubmit}
      onProduitChange={handleProduitChange}
    />
  );
}
