// ─────────────────────────────────────────────────────────────
// Schémas Zod – Validation des produits et catégories
// RF-01, RF-02, RF-03, RF-05 | RG-06
// ─────────────────────────────────────────────────────────────

import { z } from "zod";

// ─── Catégories ───────────────────────────────────────────────

/**
 * RF-01 : créer ou modifier une catégorie / sous-catégorie.
 * parentId null = catégorie racine.
 */
export const categorieSchema = z.object({
  nom: z
    .string()
    .min(1, { message: "Le nom est obligatoire." })
    .max(100, { message: "Le nom ne doit pas dépasser 100 caractères." })
    .trim(),
  parentId: z.string().uuid({ message: "Catégorie parente invalide." }).nullable().optional(),
  actif: z.boolean().optional().default(true),
});

export type CategorieInput = z.infer<typeof categorieSchema>;

/**
 * Pour la modification : id obligatoire.
 */
export const categorieUpdateSchema = categorieSchema.extend({
  id: z.string().uuid(),
});

export type CategorieUpdateInput = z.infer<typeof categorieUpdateSchema>;

// ─── Produits ─────────────────────────────────────────────────

/** RG-06 : unités courantes autorisées (liste extensible). */
export const UNITES_AUTORISEES = [
  "pièce",
  "kg",
  "g",
  "litre",
  "ml",
  "carton",
  "sac",
  "paquet",
  "mètre",
  "cm",
  "autre",
] as const;

export const uniteSchema = z
  .string()
  .min(1, { message: "L'unité est obligatoire." })
  .max(30, { message: "L'unité ne doit pas dépasser 30 caractères." })
  .trim();

/**
 * RF-02 : créer un produit rattaché à une catégorie (ou sous-catégorie).
 */
export const produitSchema = z.object({
  nom: z
    .string()
    .min(1, { message: "Le nom du produit est obligatoire." })
    .max(150, { message: "Le nom ne doit pas dépasser 150 caractères." })
    .trim(),
  categorieId: z.string().uuid({ message: "Catégorie invalide." }),
  /** RG-06 : unité libre mais non vide. */
  unite: uniteSchema,
  actif: z.boolean().optional().default(true),
});

export type ProduitInput = z.infer<typeof produitSchema>;

/**
 * Pour la modification : id obligatoire.
 */
export const produitUpdateSchema = produitSchema.extend({
  id: z.string().uuid(),
});

export type ProduitUpdateInput = z.infer<typeof produitUpdateSchema>;

/**
 * RF-03 : désactivation logique (ne supprime pas, conserve l'historique).
 */
export const toggleActifSchema = z.object({
  id: z.string().uuid(),
  actif: z.boolean(),
});

export type ToggleActifInput = z.infer<typeof toggleActifSchema>;
