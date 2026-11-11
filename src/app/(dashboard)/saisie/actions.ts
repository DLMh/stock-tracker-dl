"use server";

// ─────────────────────────────────────────────────────────────
// Server Actions — Page Saisie
//
// Ces fonctions s'exécutent côté serveur uniquement.
// Elles font le pont entre le Client Component (SaisieClient)
// et le service métier (stock.service.ts).
// ─────────────────────────────────────────────────────────────

import { localDateToUTC } from "@/lib/timezone";
import { revalidatePath } from "next/cache";
import {
  enregistrerMouvement,
  calculerStockActuel,
  StockInsuffisantError,
  QuantiteInvalideError,
  ProduitIntrouvableError,
} from "@/services/stock.service";
import { type MouvementFormValues } from "@/components/movements/MouvementForm";
import { TypeMouvement } from "@prisma/client";
import { getSession, getCurrentUserOrFallback } from "@/lib/auth";

/** Enregistre un mouvement de stock depuis le formulaire de saisie. */
export async function enregistrerMouvementAction(
  values: MouvementFormValues,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Récupère l'utilisateur connecté via la session ou fallback sécurisé
    const session = await getSession();
    const user = session || (await getCurrentUserOrFallback());

    await enregistrerMouvement({
      produitId: values.produitId,
      type: values.type as TypeMouvement,
      quantite: values.quantite,
      dateMouvement: localDateToUTC(values.dateMouvement),
      note: values.note,
      utilisateurId: user.id,
    });

    revalidatePath("/");
    revalidatePath("/historique");
    revalidatePath("/catalogue");
    revalidatePath("/saisie");

    return { success: true };
  } catch (err) {
    if (
      err instanceof StockInsuffisantError ||
      err instanceof QuantiteInvalideError ||
      err instanceof ProduitIntrouvableError
    ) {
      return { success: false, error: err.message };
    }
    console.error("[enregistrerMouvementAction]", err);
    return { success: false, error: "Erreur serveur. Veuillez réessayer." };
  }
}

/** Retourne le stock actuel d'un produit pour l'avertissement RG-02. */
export async function getStockActuelAction(
  produitId: string,
): Promise<{ stockActuel?: number; error?: string }> {
  try {
    const stock = await calculerStockActuel(produitId);
    return { stockActuel: stock.stockActuel };
  } catch {
    return { error: "Impossible de récupérer le stock." };
  }
}
