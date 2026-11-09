"use server";

// ─────────────────────────────────────────────────────────────
// Server Actions – Historique & Statistiques
// RF-12 : agrégations par jour/semaine/mois
// RF-13 : filtres par période
// RF-15 : liste chronologique des mouvements
// RF-16 : stock actuel par produit
// RG-03 : semaines ISO (lundi→dimanche)
// RG-04 : fuseau UTC+3 Antananarivo
// ─────────────────────────────────────────────────────────────

import { prisma } from "@/lib/prisma";
import { startOfDayUTC, endOfDayUTC, TZ_ANTANANARIVO } from "@/lib/timezone";
import { TypeMouvement } from "@prisma/client";

// ─── Types exportés ───────────────────────────────────────────

export type Granularite = "jour" | "semaine" | "mois";

export interface LigneAgregat {
  periode: string;       // ex: "2026-11-08" / "2026-W45" / "2026-11"
  totalEntrees: number;
  totalSorties: number;
  netMouvement: number;  // entrées − sorties
}

export interface MouvementDetail {
  id: string;
  type: TypeMouvement;
  quantite: number;
  dateMouvement: string; // ISO string
  note: string | null;
  produit: { id: string; nom: string; unite: string };
  utilisateur: { nom: string };
}

export interface StockProduit {
  produitId: string;
  nomProduit: string;
  unite: string;
  categorieNom: string;
  stockActuel: number;
  totalEntrees: number;
  totalSorties: number;
}

export interface HistoriqueResult {
  agregats: LigneAgregat[];
  mouvements: MouvementDetail[];
  stocksProduits: StockProduit[];
  totalMouvements: number;
}

export interface FiltresHistorique {
  periode: "aujourd_hui" | "7_jours" | "mois_en_cours" | "personnalise";
  dateDebut?: string;  // YYYY-MM-DD
  dateFin?: string;    // YYYY-MM-DD
  produitId?: string;
  granularite: Granularite;
  page?: number;
}

// ─── Helpers de calcul de plage ──────────────────────────────

function plageDepuisFiltres(filtres: FiltresHistorique): {
  debut: Date;
  fin: Date;
} {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: TZ_ANTANANARIVO })
  );

  switch (filtres.periode) {
    case "aujourd_hui": {
      const str = now.toLocaleDateString("fr-CA");
      return { debut: startOfDayUTC(str), fin: endOfDayUTC(str) };
    }
    case "7_jours": {
      const fin = new Date();
      const debut = new Date();
      debut.setDate(debut.getDate() - 6);
      const debutStr = debut.toLocaleDateString("fr-CA", { timeZone: TZ_ANTANANARIVO });
      const finStr = fin.toLocaleDateString("fr-CA", { timeZone: TZ_ANTANANARIVO });
      return { debut: startOfDayUTC(debutStr), fin: endOfDayUTC(finStr) };
    }
    case "mois_en_cours": {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      return {
        debut: startOfDayUTC(`${year}-${month}-01`),
        fin: endOfDayUTC(
          `${year}-${month}-${new Date(year, now.getMonth() + 1, 0).getDate()}`
        ),
      };
    }
    case "personnalise": {
      const debutStr = filtres.dateDebut ?? now.toLocaleDateString("fr-CA");
      const finStr = filtres.dateFin ?? now.toLocaleDateString("fr-CA");
      return { debut: startOfDayUTC(debutStr), fin: endOfDayUTC(finStr) };
    }
  }
}

// ─── Formatage de la période pour l'affichage ────────────────

function formatPeriode(date: Date, granularite: Granularite): string {
  // Convertir en heure locale Antananarivo
  const local = new Date(
    date.toLocaleString("en-US", { timeZone: TZ_ANTANANARIVO })
  );
  const y = local.getFullYear();
  const m = String(local.getMonth() + 1).padStart(2, "0");
  const d = String(local.getDate()).padStart(2, "0");

  if (granularite === "jour") return `${y}-${m}-${d}`;
  if (granularite === "mois") return `${y}-${m}`;

  // Semaine ISO (RG-03) : calculer le numéro de semaine
  const jan4 = new Date(y, 0, 4);
  const startOfYear = new Date(jan4);
  startOfYear.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const weekNum = Math.floor(
    (local.getTime() - startOfYear.getTime()) / (7 * 24 * 60 * 60 * 1000)
  ) + 1;
  return `${y}-S${String(weekNum).padStart(2, "0")}`;
}

// ─── Action principale ────────────────────────────────────────

export async function getHistoriqueAction(
  filtres: FiltresHistorique
): Promise<HistoriqueResult> {
  const { debut, fin } = plageDepuisFiltres(filtres);
  const page = Math.max(1, filtres.page ?? 1);
  const pageSize = 50;

  const whereBase = {
    dateMouvement: { gte: debut, lte: fin },
    ...(filtres.produitId ? { produitId: filtres.produitId } : {}),
  };

  // ── 1. Mouvements détaillés (RF-15) ──
  const [rawMouvements, totalMouvements] = await Promise.all([
    prisma.mouvement.findMany({
      where: whereBase,
      orderBy: { dateMouvement: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        produit: { select: { id: true, nom: true, unite: true } },
        utilisateur: { select: { nom: true } },
      },
    }),
    prisma.mouvement.count({ where: whereBase }),
  ]);

  const mouvements: MouvementDetail[] = rawMouvements.map((m) => ({
    id: m.id,
    type: m.type,
    quantite: Number(m.quantite),
    dateMouvement: m.dateMouvement.toISOString(),
    note: m.note,
    produit: m.produit,
    utilisateur: m.utilisateur,
  }));

  // ── 2. Agrégats (RF-12) — groupBy JS après récupération ──
  // On récupère tous les mouvements de la période pour l'agrégation
  const tousLesMouvements = await prisma.mouvement.findMany({
    where: whereBase,
    select: {
      type: true,
      quantite: true,
      dateMouvement: true,
    },
  });

  // Grouper par période selon la granularité
  const mapAgregats = new Map<
    string,
    { totalEntrees: number; totalSorties: number }
  >();

  for (const mv of tousLesMouvements) {
    const cle = formatPeriode(mv.dateMouvement, filtres.granularite);
    const courant = mapAgregats.get(cle) ?? { totalEntrees: 0, totalSorties: 0 };
    const q = Number(mv.quantite);
    if (mv.type === "ENTREE") courant.totalEntrees += q;
    else if (mv.type === "SORTIE") courant.totalSorties += q;
    // AJUSTEMENT : comptabilisé dans les entrées (correction positive)
    else courant.totalEntrees += q;
    mapAgregats.set(cle, courant);
  }

  const agregats: LigneAgregat[] = Array.from(mapAgregats.entries())
    .sort(([a], [b]) => b.localeCompare(a)) // Du plus récent au plus ancien
    .map(([periode, val]) => ({
      periode,
      totalEntrees: val.totalEntrees,
      totalSorties: val.totalSorties,
      netMouvement: val.totalEntrees - val.totalSorties,
    }));

  // ── 3. Stocks actuels par produit (RF-16) ──
  const tousLesProduits = await prisma.produit.findMany({
    where: { actif: true },
    include: {
      categorie: { select: { nom: true } },
      mouvements: {
        select: { type: true, quantite: true },
      },
    },
    orderBy: { nom: "asc" },
  });

  const stocksProduits: StockProduit[] = tousLesProduits.map((p) => {
    let totalEntrees = 0;
    let totalSorties = 0;
    for (const mv of p.mouvements) {
      const q = Number(mv.quantite);
      if (mv.type === "ENTREE" || mv.type === "AJUSTEMENT") totalEntrees += q;
      else totalSorties += q;
    }
    return {
      produitId: p.id,
      nomProduit: p.nom,
      unite: p.unite,
      categorieNom: p.categorie.nom,
      stockActuel: totalEntrees - totalSorties,
      totalEntrees,
      totalSorties,
    };
  });

  return { agregats, mouvements, stocksProduits, totalMouvements };
}

/** Charge les produits actifs pour le filtre du sélecteur. */
export async function getProduitsAction() {
  return prisma.produit.findMany({
    where: { actif: true },
    select: { id: true, nom: true, unite: true },
    orderBy: { nom: "asc" },
  });
}
