"use server";

// ─────────────────────────────────────────────────────────────
// Server Actions – Tableau de bord
// RF-19 : résumé du jour et de la semaine
// RF-20 : produits les plus sortis
// RG-01 : stock = Σ entrées − Σ sorties
// RG-03 : semaine ISO (lundi→dimanche)
// RG-04 : fuseau UTC+3 Antananarivo
// ─────────────────────────────────────────────────────────────

import { prisma } from "@/lib/prisma";
import { startOfDayUTC, endOfDayUTC, TZ_ANTANANARIVO } from "@/lib/timezone";

// ─── Types ───────────────────────────────────────────────────

export interface ResumeKpi {
  totalEntrees: number;
  totalSorties: number;
  nbMouvements: number;
}

export interface ProduitTopSorti {
  produitId: string;
  nomProduit: string;
  unite: string;
  categorieNom: string;
  totalSorti: number;
  nbMouvements: number;
}

export interface DashboardData {
  resumeJour: ResumeKpi;
  resumeSemaine: ResumeKpi;
  topProduits: ProduitTopSorti[];     // RF-20 : top 10 les plus sortis (semaine)
  derniersMouvements: {               // 5 derniers pour le feed d'activité
    id: string;
    type: string;
    quantite: number;
    dateMouvement: string;
    produitNom: string;
    produitUnite: string;
    utilisateurNom: string;
    note: string | null;
  }[];
  nbProduitsActifs: number;
  nbProduitsStockNegatif: number;
}

// ─── Helpers ─────────────────────────────────────────────────

function plageJour(): { debut: Date; fin: Date } {
  const local = new Date(
    new Date().toLocaleString("en-US", { timeZone: TZ_ANTANANARIVO })
  );
  const str = local.toLocaleDateString("fr-CA"); // YYYY-MM-DD
  return { debut: startOfDayUTC(str), fin: endOfDayUTC(str) };
}

function plageSemaine(): { debut: Date; fin: Date } {
  // RG-03 : semaine ISO, lundi → dimanche
  const local = new Date(
    new Date().toLocaleString("en-US", { timeZone: TZ_ANTANANARIVO })
  );
  const jour = local.getDay(); // 0=dim, 1=lun…
  const diffLundi = (jour + 6) % 7; // jours depuis lundi
  const lundi = new Date(local);
  lundi.setDate(local.getDate() - diffLundi);
  const dimanche = new Date(lundi);
  dimanche.setDate(lundi.getDate() + 6);

  const fmt = (d: Date) => d.toLocaleDateString("fr-CA");
  return { debut: startOfDayUTC(fmt(lundi)), fin: endOfDayUTC(fmt(dimanche)) };
}

async function kpiPeriode(debut: Date, fin: Date): Promise<ResumeKpi> {
  const agregats = await prisma.mouvement.groupBy({
    by: ["type"],
    where: { dateMouvement: { gte: debut, lte: fin } },
    _sum: { quantite: true },
    _count: { id: true },
  });

  let totalEntrees = 0;
  let totalSorties = 0;
  let nbMouvements = 0;

  for (const a of agregats) {
    const q = Number(a._sum.quantite ?? 0);
    nbMouvements += a._count.id;
    if (a.type === "ENTREE" || a.type === "AJUSTEMENT") totalEntrees += q;
    else totalSorties += q;
  }

  return { totalEntrees, totalSorties, nbMouvements };
}

// ─── Action principale ────────────────────────────────────────

export async function getDashboardDataAction(): Promise<DashboardData> {
  const { debut: debutJour, fin: finJour } = plageJour();
  const { debut: debutSem, fin: finSem } = plageSemaine();

  const [
    resumeJour,
    resumeSemaine,
    topRaw,
    derniersMouvementsRaw,
    tousLesProduits,
  ] = await Promise.all([
    // KPI jour
    kpiPeriode(debutJour, finJour),
    // KPI semaine
    kpiPeriode(debutSem, finSem),
    // Top produits les plus sortis (semaine) — RF-20
    prisma.mouvement.groupBy({
      by: ["produitId"],
      where: {
        type: "SORTIE",
        dateMouvement: { gte: debutSem, lte: finSem },
      },
      _sum: { quantite: true },
      _count: { id: true },
      orderBy: { _sum: { quantite: "desc" } },
      take: 10,
    }),
    // 5 derniers mouvements
    prisma.mouvement.findMany({
      orderBy: { dateMouvement: "desc" },
      take: 5,
      include: {
        produit: { select: { nom: true, unite: true } },
        utilisateur: { select: { nom: true } },
      },
    }),
    // Tous les produits actifs pour calcul du stock
    prisma.produit.findMany({
      where: { actif: true },
      include: {
        categorie: { select: { nom: true } },
        mouvements: { select: { type: true, quantite: true } },
      },
    }),
  ]);

  // Enrichir le top produits avec les infos du produit
  const produitsMap = new Map(tousLesProduits.map((p) => [p.id, p]));

  const topProduits: ProduitTopSorti[] = topRaw
    .map((r) => {
      const p = produitsMap.get(r.produitId);
      if (!p) return null;
      return {
        produitId: r.produitId,
        nomProduit: p.nom,
        unite: p.unite,
        categorieNom: p.categorie.nom,
        totalSorti: Number(r._sum.quantite ?? 0),
        nbMouvements: r._count.id,
      };
    })
    .filter((x): x is ProduitTopSorti => x !== null);

  // Stocks actuels pour détecter les produits à 0 ou négatif
  let nbProduitsStockNegatif = 0;
  for (const p of tousLesProduits) {
    let stock = 0;
    for (const mv of p.mouvements) {
      const q = Number(mv.quantite);
      if (mv.type === "ENTREE" || mv.type === "AJUSTEMENT") stock += q;
      else stock -= q;
    }
    if (stock <= 0) nbProduitsStockNegatif++;
  }

  const derniersMouvements = derniersMouvementsRaw.map((m) => ({
    id: m.id,
    type: m.type,
    quantite: Number(m.quantite),
    dateMouvement: m.dateMouvement.toISOString(),
    produitNom: m.produit.nom,
    produitUnite: m.produit.unite,
    utilisateurNom: m.utilisateur.nom,
    note: m.note,
  }));

  return {
    resumeJour,
    resumeSemaine,
    topProduits,
    derniersMouvements,
    nbProduitsActifs: tousLesProduits.length,
    nbProduitsStockNegatif,
  };
}

// ─── Action d'export CSV ──────────────────────────────────────

export interface ExportRow {
  date: string;
  type: string;
  produit: string;
  categorie: string;
  quantite: number;
  unite: string;
  note: string;
  saisiPar: string;
}

export async function getExportDataAction(
  periodeType: "aujourd_hui" | "semaine" | "mois" | "tout" | "personnalise" = "semaine",
  dateDebut?: string,
  dateFin?: string
): Promise<ExportRow[]> {
  const local = new Date(
    new Date().toLocaleString("en-US", { timeZone: TZ_ANTANANARIVO })
  );
  const todayStr = local.toLocaleDateString("fr-CA");

  let dateFilter: { gte?: Date; lte?: Date } | undefined;

  if (periodeType === "aujourd_hui") {
    dateFilter = {
      gte: startOfDayUTC(todayStr),
      lte: endOfDayUTC(todayStr),
    };
  } else if (periodeType === "semaine") {
    const { debut, fin } = plageSemaine();
    dateFilter = { gte: debut, lte: fin };
  } else if (periodeType === "mois") {
    const year = local.getFullYear();
    const month = String(local.getMonth() + 1).padStart(2, "0");
    const lastDay = new Date(year, local.getMonth() + 1, 0).getDate();
    dateFilter = {
      gte: startOfDayUTC(`${year}-${month}-01`),
      lte: endOfDayUTC(`${year}-${month}-${lastDay}`),
    };
  } else if (periodeType === "personnalise" && dateDebut && dateFin) {
    dateFilter = {
      gte: startOfDayUTC(dateDebut),
      lte: endOfDayUTC(dateFin),
    };
  } else if (periodeType === "tout") {
    dateFilter = undefined;
  } else {
    // Par défaut cette semaine
    const { debut, fin } = plageSemaine();
    dateFilter = { gte: debut, lte: fin };
  }

  const mouvements = await prisma.mouvement.findMany({
    where: dateFilter ? { dateMouvement: dateFilter } : {},
    orderBy: { dateMouvement: "desc" },
    include: {
      produit: {
        include: { categorie: { select: { nom: true } } },
      },
      utilisateur: { select: { nom: true } },
    },
  });

  return mouvements.map((m) => ({
    date: new Date(m.dateMouvement).toLocaleString("fr-FR", {
      timeZone: TZ_ANTANANARIVO,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    type: m.type,
    produit: m.produit.nom,
    categorie: m.produit.categorie.nom,
    quantite: Number(m.quantite),
    unite: m.produit.unite,
    note: m.note ?? "",
    saisiPar: m.utilisateur.nom,
  }));
}
