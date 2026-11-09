// ─────────────────────────────────────────────────────────────
// Stock Service – Logique métier sur les mouvements de stock
//
// Basé sur :
//   • prisma/schema.prisma  (tables mouvements, produits)
//   • resumeCC.md           (RG-01, RG-02, RF-06, RF-07, RF-10, RF-11, RF-12, RF-13, RF-15)
//
// Règles invariantes rappelées ici :
//   RG-01 : Stock = Σ ENTREE − Σ SORTIE ± Σ AJUSTEMENT
//   RG-02 : Une sortie ne doit pas rendre le stock négatif (avertissement/blocage)
//   RF-10 : La quantité est toujours strictement positive
//   RF-11 : Un mouvement enregistré n'est jamais supprimé (append-only)
// ─────────────────────────────────────────────────────────────

import { prisma } from "@/lib/prisma";
import { Prisma, TypeMouvement, type Mouvement } from "@prisma/client";

// ─────────────────────────────────────────────────────────────
// TYPES EXPORTÉS
// ─────────────────────────────────────────────────────────────

export interface EnregistrerMouvementParams {
  produitId: string;
  type: TypeMouvement;
  /** Doit être strictement positif (RF-10). */
  quantite: number;
  /** Date effective du mouvement (saisie rétroactive possible, RF-09). */
  dateMouvement: Date;
  note?: string;
  utilisateurId: string;
}

export interface StockActuel {
  produitId: string;
  nomProduit: string;
  unite: string;
  totalEntrees: number;
  totalSorties: number;
  totalAjustements: number;
  /** Stock final calculé selon RG-01 */
  stockActuel: number;
}

export interface FiltresMouvements {
  produitId?: string;
  categorieId?: string;
  type?: TypeMouvement;
  /** Borne inférieure de la période (incluse) */
  dateDebut?: Date;
  /** Borne supérieure de la période (incluse) */
  dateFin?: Date;
  /** Numéro de page (commence à 1). Défaut : 1 */
  page?: number;
  /** Nombre de résultats par page. Défaut : 50, max : 200 */
  pageSize?: number;
}

export interface PagedMouvements {
  data: Mouvement[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─────────────────────────────────────────────────────────────
// ERREURS MÉTIER
// ─────────────────────────────────────────────────────────────

export class StockInsuffisantError extends Error {
  constructor(
    public readonly produitId: string,
    public readonly stockActuel: number,
    public readonly quantiteDemandee: number,
  ) {
    super(
      `Stock insuffisant pour le produit ${produitId} : ` +
        `stock actuel = ${stockActuel}, sortie demandée = ${quantiteDemandee}.`,
    );
    this.name = "StockInsuffisantError";
  }
}

export class QuantiteInvalideError extends Error {
  constructor(quantite: number) {
    super(`La quantité doit être strictement positive (reçu : ${quantite}).`);
    this.name = "QuantiteInvalideError";
  }
}

export class ProduitIntrouvableError extends Error {
  constructor(produitId: string) {
    super(`Produit introuvable ou désactivé : ${produitId}.`);
    this.name = "ProduitIntrouvableError";
  }
}

// ─────────────────────────────────────────────────────────────
// FONCTION 1 — Enregistrer un mouvement (entrée / sortie / ajustement)
//
// RF-06 : entrée, RF-07 : sortie, RF-10 : quantité > 0
// RG-02 : blocage si sortie > stock actuel
// RF-11 : append-only (aucune modification ultérieure)
// ─────────────────────────────────────────────────────────────

/**
 * Enregistre un mouvement de stock de façon transactionnelle.
 *
 * @throws {QuantiteInvalideError}    si quantite ≤ 0 (RF-10)
 * @throws {ProduitIntrouvableError}  si le produit n'existe pas ou est désactivé
 * @throws {StockInsuffisantError}    si une SORTIE rend le stock négatif (RG-02)
 */
export async function enregistrerMouvement(
  params: EnregistrerMouvementParams,
): Promise<Mouvement> {
  const { produitId, type, quantite, dateMouvement, note, utilisateurId } = params;

  // ── Validation RF-10 : quantité strictement positive ──
  if (!Number.isFinite(quantite) || quantite <= 0) {
    throw new QuantiteInvalideError(quantite);
  }

  return prisma.$transaction(async (tx) => {
    // ── Vérifier que le produit existe et est actif ──
    const produit = await tx.produit.findUnique({
      where: { id: produitId },
      select: { id: true, actif: true, nom: true },
    });

    if (!produit || !produit.actif) {
      throw new ProduitIntrouvableError(produitId);
    }

    // ── RG-02 : vérifier que le stock ne deviendrait pas négatif pour une SORTIE ──
    if (type === TypeMouvement.SORTIE) {
      const stock = await calculerStockActuel(produitId, tx);

      if (stock.stockActuel < quantite) {
        throw new StockInsuffisantError(produitId, stock.stockActuel, quantite);
      }
    }

    // ── Enregistrement append-only (RF-11) ──
    const mouvement = await tx.mouvement.create({
      data: {
        produitId,
        type,
        quantite: new Prisma.Decimal(quantite),
        dateMouvement,
        note: note ?? null,
        utilisateurId,
      },
    });

    return mouvement;
  });
}

// ─────────────────────────────────────────────────────────────
// FONCTION 2 — Calculer le stock actuel d'un produit
//
// RG-01 : Stock = Σ ENTREE − Σ SORTIE ± Σ AJUSTEMENT
// RF-16  : afficher le stock actuel par produit
// ─────────────────────────────────────────────────────────────

/**
 * Calcule le stock actuel d'un produit à partir des mouvements enregistrés.
 * Accepte une transaction Prisma en cours pour être appelé dans un contexte transactionnel.
 *
 * @param produitId   - UUID du produit
 * @param txClient    - Client Prisma (transaction ou client global)
 */
export async function calculerStockActuel(
  produitId: string,
  txClient: Parameters<Parameters<typeof prisma.$transaction>[0]>[0] | typeof prisma = prisma,
): Promise<StockActuel> {
  // Récupérer les informations du produit
  const produit = await txClient.produit.findUnique({
    where: { id: produitId },
    select: { id: true, nom: true, unite: true },
  });

  if (!produit) {
    throw new ProduitIntrouvableError(produitId);
  }

  // Agrégation des quantités par type (RG-01)
  const agregation = await txClient.mouvement.groupBy({
    by: ["type"],
    where: { produitId },
    _sum: { quantite: true },
  });

  // Extraire les sommes par type
  const somme = (type: TypeMouvement): number => {
    const ligne = agregation.find((r) => r.type === type);
    return ligne?._sum.quantite ? Number(ligne._sum.quantite) : 0;
  };

  const totalEntrees = somme(TypeMouvement.ENTREE);
  const totalSorties = somme(TypeMouvement.SORTIE);
  const totalAjustements = somme(TypeMouvement.AJUSTEMENT);

  // RG-01 : stock = entrées − sorties ± ajustements
  // Note : les ajustements peuvent être positifs (correction en hausse) ou négatifs
  // mais la quantité en BDD est toujours positive (RF-10), le sens est donné par le type.
  // Ici on traite AJUSTEMENT comme une correction additive nette.
  const stockActuel = totalEntrees - totalSorties + totalAjustements;

  return {
    produitId: produit.id,
    nomProduit: produit.nom,
    unite: produit.unite,
    totalEntrees,
    totalSorties,
    totalAjustements,
    stockActuel,
  };
}

// ─────────────────────────────────────────────────────────────
// FONCTION 3 — Lister les mouvements avec pagination et filtres
//
// RF-12 : historique par produit, (sous-)catégorie, période
// RF-13 : filtrer par période (aujourd'hui, 7j, mois, personnalisé)
// RF-15 : détail des mouvements (liste chronologique)
// ─────────────────────────────────────────────────────────────

const PAGE_SIZE_DEFAULT = 50;
const PAGE_SIZE_MAX = 200;

/**
 * Retourne une page de mouvements avec le total pour la pagination.
 * Les mouvements sont triés du plus récent au plus ancien (RF-15).
 *
 * @param filtres - Critères de filtrage et pagination
 */
export async function listerMouvements(
  filtres: FiltresMouvements = {},
): Promise<PagedMouvements> {
  const {
    produitId,
    categorieId,
    type,
    dateDebut,
    dateFin,
    page = 1,
    pageSize: rawPageSize = PAGE_SIZE_DEFAULT,
  } = filtres;

  // Clamp sur la taille de page
  const pageSize = Math.min(Math.max(1, rawPageSize), PAGE_SIZE_MAX);
  const skip = (Math.max(1, page) - 1) * pageSize;

  // ── Construction de la clause WHERE ──
  const where = {
    // Filtre par produit direct
    ...(produitId ? { produitId } : {}),

    // Filtre par catégorie : on remonte les produits appartenant à cette catégorie
    // (ou ses sous-catégories via une sous-requête)
    ...(categorieId
      ? {
          produit: {
            categorie: {
              // Chercher dans la catégorie et ses descendants directs
              OR: [
                { id: categorieId },
                { parentId: categorieId },
              ],
            },
          },
        }
      : {}),

    // Filtre par type de mouvement
    ...(type ? { type } : {}),

    // Filtre par période (RF-13) — RG-04 : dates en UTC+3
    ...((dateDebut || dateFin)
      ? {
          dateMouvement: {
            ...(dateDebut ? { gte: dateDebut } : {}),
            ...(dateFin ? { lte: dateFin } : {}),
          },
        }
      : {}),
  };

  // ── Exécution en parallèle : données + comptage total ──
  const [data, total] = await Promise.all([
    prisma.mouvement.findMany({
      where,
      orderBy: { dateMouvement: "desc" }, // RF-15 : ordre chronologique inverse
      skip,
      take: pageSize,
      include: {
        produit: {
          select: { id: true, nom: true, unite: true },
        },
        utilisateur: {
          select: { id: true, nom: true, identifiant: true },
        },
      },
    }),
    prisma.mouvement.count({ where }),
  ]);

  return {
    data,
    total,
    page: Math.max(1, page),
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
