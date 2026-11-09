// ─────────────────────────────────────────────────────────────
// Schémas Zod – Validation des mouvements de stock
// RF-06, RF-07, RF-08, RF-10 | RG-01, RG-02
// ─────────────────────────────────────────────────────────────

import { z } from "zod";

// Enum aligné sur schema.prisma
export const TypeMouvementEnum = z.enum(["ENTREE", "SORTIE", "AJUSTEMENT"]);

/**
 * RF-10 : la quantité doit être strictement positive.
 * Le type (ENTREE/SORTIE) détermine le sens, pas le signe.
 */
export const quantitePositive = z
  .number()
  .positive({ message: "La quantité doit être strictement positive." })
  .finite()
  .multipleOf(0.001, { message: "Maximum 3 décimales autorisées." });

/**
 * Schéma pour l'enregistrement d'un seul mouvement (RF-06, RF-07).
 */
export const mouvementSchema = z.object({
  produitId: z.string().uuid({ message: "Produit invalide." }),
  type: TypeMouvementEnum,
  quantite: quantitePositive,
  /** RF-09 : date par défaut = aujourd'hui, modifiable (saisie rétroactive) */
  dateMouvement: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Format de date invalide (YYYY-MM-DD)." }),
  note: z.string().max(500, { message: "La note ne doit pas dépasser 500 caractères." }).optional(),
});

export type MouvementInput = z.infer<typeof mouvementSchema>;

/**
 * Schéma pour la saisie rapide de plusieurs mouvements à la fois (RF-08).
 * Exemple : liste de sorties du jour pour plusieurs produits.
 */
export const mouvementsBatchSchema = z.object({
  mouvements: z
    .array(mouvementSchema)
    .min(1, { message: "Au moins un mouvement est requis." })
    .max(100, { message: "Limite de 100 mouvements par lot." }),
});

export type MouvementsBatchInput = z.infer<typeof mouvementsBatchSchema>;

/**
 * Schéma pour un mouvement d'ajustement / correction (RF-11).
 * Note obligatoire pour justifier la correction.
 */
export const ajustementSchema = mouvementSchema
  .extend({
    type: z.literal("AJUSTEMENT"),
    note: z
      .string()
      .min(5, { message: "Une note explicative est obligatoire pour un ajustement." })
      .max(500),
  });

export type AjustementInput = z.infer<typeof ajustementSchema>;
