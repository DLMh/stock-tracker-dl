"use server";

// ─────────────────────────────────────────────────────────────
// Server Actions – Gestion du Catalogue
// Catégorie > Sous-catégorie > Produit (CRUD complet)
// RF-01 : créer, modifier, désactiver une catégorie ou sous-catégorie
// RF-02 : créer, modifier, désactiver un produit
// RF-03 : désactivation logique (historique préservé)
// RF-04 : arborescence & recherche
// RF-05 : niveaux libres & illimités
// RG-06 : unité paramétrable par produit
// ─────────────────────────────────────────────────────────────

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import {
  categorieSchema,
  categorieUpdateSchema,
  produitSchema,
  produitUpdateSchema,
} from "@/lib/validations/product";

// ─── Types d'échange ─────────────────────────────────────────

export interface ProduitCatalogue {
  id: string;
  nom: string;
  unite: string;
  actif: boolean;
  categorieId: string;
  categorieNom: string;
  parentCategorieNom?: string | null;
  cheminComplet: string;
  stockActuel: number;
  nbMouvements: number;
}

export interface CategorieCatalogue {
  id: string;
  nom: string;
  actif: boolean;
  parentId: string | null;
  parentNom?: string | null;
  sousCategories: { id: string; nom: string; actif: boolean; nbProduits: number }[];
  produits: { id: string; nom: string; unite: string; actif: boolean; stockActuel: number }[];
  nbTotalProduits: number;
  nbTotalSousCategories: number;
}

export interface CatalogueData {
  categoriesRacines: CategorieCatalogue[];
  toutesCategories: { id: string; nom: string; parentId: string | null; chemin: string }[];
  tousProduits: ProduitCatalogue[];
}

// ─── Récupération de tout le catalogue ────────────────────────

export async function getCatalogueDataAction(): Promise<CatalogueData> {
  const [categoriesBrutes, produitsBruts] = await Promise.all([
    prisma.categorie.findMany({
      orderBy: { nom: "asc" },
      include: {
        parent: { select: { id: true, nom: true } },
        sousCategories: {
          orderBy: { nom: "asc" },
          select: {
            id: true,
            nom: true,
            actif: true,
            produits: { select: { id: true } },
          },
        },
        produits: {
          orderBy: { nom: "asc" },
          include: {
            mouvements: { select: { type: true, quantite: true } },
          },
        },
      },
    }),
    prisma.produit.findMany({
      orderBy: { nom: "asc" },
      include: {
        categorie: {
          select: {
            id: true,
            nom: true,
            parent: { select: { id: true, nom: true } },
          },
        },
        mouvements: { select: { type: true, quantite: true } },
      },
    }),
  ]);

  // Carte pour construire les chemins complets
  const catMap = new Map(categoriesBrutes.map((c) => [c.id, c]));

  function getCheminCategorie(catId: string): string {
    const c = catMap.get(catId);
    if (!c) return "";
    if (c.parentId && catMap.has(c.parentId)) {
      return `${getCheminCategorie(c.parentId)} › ${c.nom}`;
    }
    return c.nom;
  }

  // Liste plate de toutes les catégories avec chemin complet pour les sélecteurs
  const toutesCategories = categoriesBrutes.map((c) => ({
    id: c.id,
    nom: c.nom,
    parentId: c.parentId,
    chemin: getCheminCategorie(c.id),
  })).sort((a, b) => a.chemin.localeCompare(b.chemin));

  // Produits formatés
  const tousProduits: ProduitCatalogue[] = produitsBruts.map((p) => {
    let stock = 0;
    for (const m of p.mouvements) {
      const q = Number(m.quantite);
      if (m.type === "ENTREE" || m.type === "AJUSTEMENT") stock += q;
      else stock -= q;
    }

    const chemin = p.categorie.parent
      ? `${p.categorie.parent.nom} › ${p.categorie.nom} › ${p.nom}`
      : `${p.categorie.nom} › ${p.nom}`;

    return {
      id: p.id,
      nom: p.nom,
      unite: p.unite,
      actif: p.actif,
      categorieId: p.categorie.id,
      categorieNom: p.categorie.nom,
      parentCategorieNom: p.categorie.parent?.nom ?? null,
      cheminComplet: chemin,
      stockActuel: stock,
      nbMouvements: p.mouvements.length,
    };
  });

  // Catégories racines (arborescence)
  const categoriesRacines: CategorieCatalogue[] = categoriesBrutes
    .filter((c) => c.parentId === null)
    .map((c) => {
      // Calcul du stock pour les produits directs
      const prods = c.produits.map((p) => {
        let stock = 0;
        for (const m of p.mouvements) {
          const q = Number(m.quantite);
          if (m.type === "ENTREE" || m.type === "AJUSTEMENT") stock += q;
          else stock -= q;
        }
        return {
          id: p.id,
          nom: p.nom,
          unite: p.unite,
          actif: p.actif,
          stockActuel: stock,
        };
      });

      // Sous-catégories directes
      const subCats = c.sousCategories.map((s) => ({
        id: s.id,
        nom: s.nom,
        actif: s.actif,
        nbProduits: s.produits.length,
      }));

      return {
        id: c.id,
        nom: c.nom,
        actif: c.actif,
        parentId: null,
        parentNom: null,
        sousCategories: subCats,
        produits: prods,
        nbTotalProduits: prods.length,
        nbTotalSousCategories: subCats.length,
      };
    });

  return {
    categoriesRacines,
    toutesCategories,
    tousProduits,
  };
}

// ─── Actions Catégories ───────────────────────────────────────

export async function creerCategorieAction(data: {
  nom: string;
  parentId?: string | null;
}) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Action non autorisée. Veuillez vous connecter." };
    }

    const val = categorieSchema.parse({
      nom: data.nom,
      parentId: data.parentId || null,
      actif: true,
    });

    await prisma.categorie.create({
      data: {
        nom: val.nom,
        parentId: val.parentId ?? null,
        actif: true,
      },
    });

    revalidatePath("/catalogue");
    revalidatePath("/saisie");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur de création de catégorie";
    return { success: false, error: msg };
  }
}

export async function modifierCategorieAction(data: {
  id: string;
  nom: string;
  parentId?: string | null;
  actif?: boolean;
}) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Action non autorisée. Veuillez vous connecter." };
    }

    const val = categorieUpdateSchema.parse({
      id: data.id,
      nom: data.nom,
      parentId: data.parentId || null,
      actif: data.actif ?? true,
    });

    // Éviter qu'une catégorie devienne son propre parent
    if (val.parentId === val.id) {
      return { success: false, error: "Une catégorie ne peut pas être sa propre parente." };
    }

    await prisma.categorie.update({
      where: { id: val.id },
      data: {
        nom: val.nom,
        parentId: val.parentId ?? null,
        actif: val.actif,
      },
    });

    revalidatePath("/catalogue");
    revalidatePath("/saisie");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur lors de la modification";
    return { success: false, error: msg };
  }
}

export async function toggleActifCategorieAction(id: string, actif: boolean) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Action non autorisée. Veuillez vous connecter." };
    }

    await prisma.categorie.update({
      where: { id },
      data: { actif },
    });
    revalidatePath("/catalogue");
    revalidatePath("/saisie");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur lors du changement de statut";
    return { success: false, error: msg };
  }
}

export async function supprimerCategorieAction(id: string) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Action non autorisée. Veuillez vous connecter." };
    }

    // Vérifier si des sous-catégories y sont rattachées
    const sousCatCount = await prisma.categorie.count({
      where: { parentId: id },
    });
    if (sousCatCount > 0) {
      return {
        success: false,
        error: `Impossible de supprimer : cette catégorie contient ${sousCatCount} sous-catégorie(s). Supprimez ou déplacez-les d'abord, ou désactivez-la.`,
      };
    }

    // Vérifier si des produits y sont rattachés
    const prodCount = await prisma.produit.count({
      where: { categorieId: id },
    });
    if (prodCount > 0) {
      return {
        success: false,
        error: `Impossible de supprimer : cette catégorie contient ${prodCount} produit(s). Déplacez ou supprimez ces produits au préalable.`,
      };
    }

    await prisma.categorie.delete({
      where: { id },
    });

    revalidatePath("/catalogue");
    revalidatePath("/saisie");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur lors de la suppression";
    return { success: false, error: msg };
  }
}

// ─── Actions Produits ─────────────────────────────────────────

export async function creerProduitAction(data: {
  nom: string;
  categorieId: string;
  unite: string;
}) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Action non autorisée. Veuillez vous connecter." };
    }

    const val = produitSchema.parse({
      nom: data.nom,
      categorieId: data.categorieId,
      unite: data.unite,
      actif: true,
    });

    await prisma.produit.create({
      data: {
        nom: val.nom,
        categorieId: val.categorieId,
        unite: val.unite,
        actif: true,
      },
    });

    revalidatePath("/catalogue");
    revalidatePath("/saisie");
    revalidatePath("/historique");
    revalidatePath("/");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur lors de la création du produit";
    return { success: false, error: msg };
  }
}

export async function modifierProduitAction(data: {
  id: string;
  nom: string;
  categorieId: string;
  unite: string;
  actif?: boolean;
}) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Action non autorisée. Veuillez vous connecter." };
    }

    const val = produitUpdateSchema.parse({
      id: data.id,
      nom: data.nom,
      categorieId: data.categorieId,
      unite: data.unite,
      actif: data.actif ?? true,
    });

    await prisma.produit.update({
      where: { id: val.id },
      data: {
        nom: val.nom,
        categorieId: val.categorieId,
        unite: val.unite,
        actif: val.actif,
      },
    });

    revalidatePath("/catalogue");
    revalidatePath("/saisie");
    revalidatePath("/historique");
    revalidatePath("/");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur lors de la modification du produit";
    return { success: false, error: msg };
  }
}

export async function toggleActifProduitAction(id: string, actif: boolean) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Action non autorisée. Veuillez vous connecter." };
    }

    await prisma.produit.update({
      where: { id },
      data: { actif },
    });
    revalidatePath("/catalogue");
    revalidatePath("/saisie");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur lors du changement de statut";
    return { success: false, error: msg };
  }
}

export async function supprimerProduitAction(id: string) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Action non autorisée. Veuillez vous connecter." };
    }
    // RÈGLE MÉTIER (RF-11 / append-only) :
    // Un produit avec des mouvements enregistrés ne DOIT PAS être supprimé physiquement
    // pour ne pas altérer l'intégrité comptable et les totaux historiques.
    const countMouvements = await prisma.mouvement.count({
      where: { produitId: id },
    });

    if (countMouvements > 0) {
      return {
        success: false,
        error: `Ce produit possède ${countMouvements} mouvement(s) dans l'historique. Conformément aux règles d'audit, il ne peut pas être supprimé. Vous pouvez en revanche le désactiver (RF-03) : il ne sera plus proposé lors des saisies.`,
      };
    }

    // Aucun mouvement : suppression physique autorisée (ex: produit créé par erreur)
    await prisma.produit.delete({
      where: { id },
    });

    revalidatePath("/catalogue");
    revalidatePath("/saisie");
    revalidatePath("/historique");
    revalidatePath("/");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur lors de la suppression du produit";
    return { success: false, error: msg };
  }
}
