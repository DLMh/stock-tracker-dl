"use client";

// ─────────────────────────────────────────────────────────────
// HistoriqueClient — Client Component principal
// Gère les filtres, l'affichage des agrégats, de la liste
// des mouvements et des stocks par produit.
//
// RF-12, RF-13, RF-15, RF-16, RF-17 | RG-03, RG-04
// ─────────────────────────────────────────────────────────────

import { useState, useTransition } from "react";
import * as XLSX from "xlsx";
import { getExportDataAction } from "@/app/actions";
import {
  getHistoriqueAction,
  type FiltresHistorique,
  type HistoriqueResult,
  type Granularite,
  type MouvementDetail,
  type LigneAgregat,
  type StockProduit,
} from "./actions";
import { todayString } from "@/lib/timezone";

// ─── Types locaux ─────────────────────────────────────────────

type Periode = FiltresHistorique["periode"];
type Onglet = "agregats" | "mouvements" | "stocks";

interface Props {
  donneesInitiales: HistoriqueResult;
  produits: { id: string; nom: string; unite: string }[];
}

// ─── Helpers ──────────────────────────────────────────────────

function cls(...c: (string | false | undefined | null)[]) {
  return c.filter(Boolean).join(" ");
}

function formatQuantite(n: number, unite: string) {
  return `${Number.isInteger(n) ? n : n.toFixed(3)} ${unite}`;
}

function formatPeriodeLabel(periode: string): string {
  // "2026-11-08" → "08 nov. 2026"
  if (/^\d{4}-\d{2}-\d{2}$/.test(periode)) {
    return new Date(periode + "T12:00:00").toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  // "2026-S45" → "Semaine 45 / 2026"
  if (/^\d{4}-S\d{2}$/.test(periode)) {
    const [y, s] = periode.split("-S");
    return `Sem. ${s} / ${y}`;
  }
  // "2026-11" → "novembre 2026"
  if (/^\d{4}-\d{2}$/.test(periode)) {
    const [y, m] = periode.split("-");
    return new Date(Number(y), Number(m) - 1).toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    });
  }
  return periode;
}

function formatDateMouvement(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    timeZone: "Indian/Antananarivo",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Composant principal ──────────────────────────────────────

export function HistoriqueClient({ donneesInitiales, produits }: Props) {
  const [donnees, setDonnees] = useState<HistoriqueResult>(donneesInitiales);
  const [periode, setPeriode] = useState<Periode>("mois_en_cours");
  const [granularite, setGranularite] = useState<Granularite>("jour");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState(todayString());
  const [produitId, setProduitId] = useState("");
  const [onglet, setOnglet] = useState<Onglet>("agregats");
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [isExporting, startExportTransition] = useTransition();

  // ── Lancer une recherche ──
  function charger(overrides: Partial<FiltresHistorique> = {}) {
    const filtres: FiltresHistorique = {
      periode,
      granularite,
      dateDebut: dateDebut || undefined,
      dateFin: dateFin || undefined,
      produitId: produitId || undefined,
      page,
      ...overrides,
    };
    startTransition(async () => {
      const res = await getHistoriqueAction(filtres);
      setDonnees(res);
    });
  }

  function changerPeriode(p: Periode) {
    setPeriode(p);
    setPage(1);
    charger({ periode: p, page: 1 });
  }

  function changerGranularite(g: Granularite) {
    setGranularite(g);
    charger({ granularite: g });
  }

  function changerPage(p: number) {
    setPage(p);
    charger({ page: p });
  }

  const handleExport = (format: "excel" | "csv") => {
    startExportTransition(async () => {
      try {
        let exportType: "aujourd_hui" | "semaine" | "mois" | "tout" | "personnalise" = "semaine";
        if (periode === "aujourd_hui") exportType = "aujourd_hui";
        else if (periode === "7_jours") exportType = "semaine";
        else if (periode === "mois_en_cours") exportType = "mois";
        else if (periode === "personnalise") exportType = "personnalise";

        const rows = await getExportDataAction(exportType, dateDebut, dateFin);

        if (rows.length === 0) {
          alert("Aucun mouvement trouvé pour la période sélectionnée.");
          return;
        }

        const headers = [
          "Date et Heure",
          "Type",
          "Produit",
          "Catégorie",
          "Quantité",
          "Unité",
          "Note",
          "Saisi par",
        ];

        const dateSuffix = new Date().toISOString().slice(0, 10);

        if (format === "excel") {
          const wsData = [
            headers,
            ...rows.map((r) => [
              r.date,
              r.type,
              r.produit,
              r.categorie,
              r.quantite,
              r.unite,
              r.note,
              r.saisiPar,
            ]),
          ];

          const ws = XLSX.utils.aoa_to_sheet(wsData);
          ws["!cols"] = [
            { wch: 20 },
            { wch: 14 },
            { wch: 28 },
            { wch: 22 },
            { wch: 14 },
            { wch: 10 },
            { wch: 32 },
            { wch: 18 },
          ];

          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Historique");

          const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
          const blob = new Blob([buf], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          });

          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `historique_stock_${dateSuffix}.xlsx`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } else {
          const sanitizeCsvCell = (val: string | number) => {
            let str = String(val ?? "").trim();
            if (/^[=+@-]/.test(str)) str = "'" + str;
            return `"${str.replace(/"/g, '""')}"`;
          };

          const lines = [
            headers.map(sanitizeCsvCell).join(","),
            ...rows.map((r) =>
              [
                r.date,
                r.type,
                r.produit,
                r.categorie,
                r.quantite,
                r.unite,
                r.note,
                r.saisiPar,
              ]
                .map(sanitizeCsvCell)
                .join(",")
            ),
          ];

          const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
            type: "text/csv;charset=utf-8;",
          });

          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `historique_stock_${dateSuffix}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      } catch (err) {
        console.error(err);
        alert("Erreur lors de l'export des données.");
      }
    });
  };

  const totalPages = Math.ceil(donnees.totalMouvements / 50);

  // ─────────────────────────────────────────────────────────
  // RENDU
  // ─────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">

      {/* ══ TITRE & EXPORTS ══ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Historique & Statistiques</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Mouvements de stock — données en heure d'Antananarivo (UTC+3)
          </p>
        </div>

        {/* Boutons d'export rapide */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            disabled={isExporting}
            onClick={() => handleExport("excel")}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
            title="Exporter l'historique en classeur Excel (.xlsx)"
          >
            <span>📊</span>
            <span>{isExporting ? "Export..." : "Excel (.xlsx)"}</span>
          </button>
          <button
            type="button"
            disabled={isExporting}
            onClick={() => handleExport("csv")}
            className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold border border-gray-300 shadow-sm flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
            title="Exporter l'historique en fichier CSV (.csv)"
          >
            <span>📄</span>
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* ══ PANNEAU FILTRES ══ */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-5">

        {/* Filtres rapides de période */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Période
          </p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { val: "aujourd_hui", label: "Aujourd'hui" },
                { val: "7_jours", label: "7 derniers jours" },
                { val: "mois_en_cours", label: "Mois en cours" },
                { val: "personnalise", label: "Personnalisé" },
              ] as { val: Periode; label: string }[]
            ).map(({ val, label }) => (
              <button
                key={val}
                onClick={() => changerPeriode(val)}
                className={cls(
                  "rounded-xl px-4 py-2 text-sm font-medium transition-colors border",
                  periode === val
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Dates personnalisées */}
        {periode === "personnalise" && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-medium text-gray-600">Du</label>
              <input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-medium text-gray-600">Au</label>
              <input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                className="rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => charger()}
                className="rounded-xl bg-indigo-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                Appliquer
              </button>
            </div>
          </div>
        )}

        {/* Filtres secondaires : produit + granularité */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Sélecteur produit */}
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs font-medium text-gray-600">Produit</label>
            <select
              value={produitId}
              onChange={(e) => {
                setProduitId(e.target.value);
                charger({ produitId: e.target.value || undefined });
              }}
              className="rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            >
              <option value="">Tous les produits</option>
              {produits.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom} ({p.unite})
                </option>
              ))}
            </select>
          </div>

          {/* Granularité */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Regrouper par</label>
            <div className="flex gap-1">
              {(["jour", "semaine", "mois"] as Granularite[]).map((g) => (
                <button
                  key={g}
                  onClick={() => changerGranularite(g)}
                  className={cls(
                    "px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors capitalize",
                    granularite === g
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50",
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ ONGLETS ══ */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 self-start">
        {(
          [
            { val: "agregats", label: "Résumé" },
            { val: "mouvements", label: `Détail (${donnees.totalMouvements})` },
            { val: "stocks", label: "Stocks actuels" },
          ] as { val: Onglet; label: string }[]
        ).map(({ val, label }) => (
          <button
            key={val}
            onClick={() => setOnglet(val)}
            className={cls(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              onglet === val
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Indicateur de chargement */}
      {isPending && (
        <div className="text-center text-sm text-gray-500 animate-pulse py-2">
          Chargement…
        </div>
      )}

      {/* ══ CONTENU DES ONGLETS ══ */}
      <div className={cls(isPending ? "opacity-50 pointer-events-none" : "")}>

        {/* ─── ONGLET 1 : AGRÉGATS (RF-12, RF-17) ─── */}
        {onglet === "agregats" && (
          <AgregatTable agregats={donnees.agregats} />
        )}

        {/* ─── ONGLET 2 : MOUVEMENTS DÉTAILLÉS (RF-15) ─── */}
        {onglet === "mouvements" && (
          <MouvementsTable
            mouvements={donnees.mouvements}
            page={page}
            totalPages={totalPages}
            onPageChange={changerPage}
          />
        )}

        {/* ─── ONGLET 3 : STOCKS ACTUELS (RF-16) ─── */}
        {onglet === "stocks" && (
          <StocksTable stocks={donnees.stocksProduits} />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sous-composant : Tableau des agrégats
// ─────────────────────────────────────────────────────────────

function AgregatTable({ agregats }: { agregats: LigneAgregat[] }) {
  if (agregats.length === 0) {
    return <EmptyState message="Aucun mouvement sur cette période." />;
  }

  // Totaux généraux
  const totalEntrees = agregats.reduce((s, r) => s + r.totalEntrees, 0);
  const totalSorties = agregats.reduce((s, r) => s + r.totalSorties, 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Carte récap */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 bg-gray-50 border-b border-gray-200">
        <div className="px-5 py-4 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total entrées</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            +{totalEntrees.toFixed(2)}
          </p>
        </div>
        <div className="px-5 py-4 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total sorties</p>
          <p className="text-2xl font-bold text-red-500 mt-1">
            −{totalSorties.toFixed(2)}
          </p>
        </div>
        <div className="px-5 py-4 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Net</p>
          <p
            className={cls(
              "text-2xl font-bold mt-1",
              totalEntrees - totalSorties >= 0 ? "text-indigo-600" : "text-orange-500",
            )}
          >
            {totalEntrees - totalSorties >= 0 ? "+" : ""}
            {(totalEntrees - totalSorties).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left px-5 py-3">Période</th>
              <th className="text-right px-5 py-3 text-emerald-600">Entrées</th>
              <th className="text-right px-5 py-3 text-red-500">Sorties</th>
              <th className="text-right px-5 py-3">Net</th>
              {/* Barre visuelle */}
              <th className="px-5 py-3 w-32 hidden sm:table-cell"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {agregats.map((ligne) => {
              const maxVal = Math.max(
                ...agregats.map((r) => Math.max(r.totalEntrees, r.totalSorties)),
                1
              );
              const pctE = Math.round((ligne.totalEntrees / maxVal) * 100);
              const pctS = Math.round((ligne.totalSorties / maxVal) * 100);

              return (
                <tr key={ligne.periode} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-gray-800">
                    {formatPeriodeLabel(ligne.periode)}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-emerald-600">
                    +{ligne.totalEntrees.toFixed(2)}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-red-500">
                    −{ligne.totalSorties.toFixed(2)}
                  </td>
                  <td
                    className={cls(
                      "px-5 py-3.5 text-right font-mono font-semibold",
                      ligne.netMouvement >= 0 ? "text-indigo-600" : "text-orange-500",
                    )}
                  >
                    {ligne.netMouvement >= 0 ? "+" : ""}
                    {ligne.netMouvement.toFixed(2)}
                  </td>
                  {/* Mini barres */}
                  <td className="px-5 py-3.5 hidden sm:table-cell">
                    <div className="flex flex-col gap-1">
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-emerald-400 transition-all"
                          style={{ width: `${pctE}%` }}
                        />
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-red-400 transition-all"
                          style={{ width: `${pctS}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sous-composant : Liste des mouvements détaillés
// ─────────────────────────────────────────────────────────────

function MouvementsTable({
  mouvements,
  page,
  totalPages,
  onPageChange,
}: {
  mouvements: MouvementDetail[];
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (mouvements.length === 0) {
    return <EmptyState message="Aucun mouvement sur cette période." />;
  }

  const badgeType = (type: string) => {
    if (type === "ENTREE")
      return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    if (type === "SORTIE")
      return "bg-red-100 text-red-700 border border-red-200";
    return "bg-amber-100 text-amber-700 border border-amber-200";
  };

  const labelType = (type: string) => {
    if (type === "ENTREE") return "+ Entrée";
    if (type === "SORTIE") return "− Sortie";
    return "⚖ Ajustement";
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Liste carte (mobile) + table (desktop) */}

      {/* Mobile : cartes */}
      <div className="flex flex-col gap-3 sm:hidden">
        {mouvements.map((mv) => (
          <div
            key={mv.id}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <span
                className={cls(
                  "text-xs font-semibold px-2 py-0.5 rounded-full",
                  badgeType(mv.type),
                )}
              >
                {labelType(mv.type)}
              </span>
              <span className="text-xs text-gray-400">
                {formatDateMouvement(mv.dateMouvement)}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-gray-900">
                {mv.type === "SORTIE" ? "−" : "+"}
                {mv.quantite.toFixed(3)}
              </span>
              <span className="text-sm text-gray-500">{mv.produit.unite}</span>
            </div>
            <p className="text-sm font-medium text-gray-700">{mv.produit.nom}</p>
            {mv.note && (
              <p className="text-xs text-gray-400 italic">« {mv.note} »</p>
            )}
            <p className="text-xs text-gray-400">Par : {mv.utilisateur.nom}</p>
          </div>
        ))}
      </div>

      {/* Desktop : tableau */}
      <div className="hidden sm:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide bg-gray-50">
                <th className="text-left px-5 py-3">Date</th>
                <th className="text-left px-5 py-3">Type</th>
                <th className="text-left px-5 py-3">Produit</th>
                <th className="text-right px-5 py-3">Quantité</th>
                <th className="text-left px-5 py-3">Note</th>
                <th className="text-left px-5 py-3">Saisi par</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {mouvements.map((mv) => (
                <tr
                  key={mv.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">
                    {formatDateMouvement(mv.dateMouvement)}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={cls(
                        "text-xs font-semibold px-2 py-0.5 rounded-full",
                        badgeType(mv.type),
                      )}
                    >
                      {labelType(mv.type)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-medium text-gray-800">
                    {mv.produit.nom}
                  </td>
                  <td
                    className={cls(
                      "px-5 py-3.5 text-right font-mono font-semibold",
                      mv.type === "SORTIE" ? "text-red-600" : "text-emerald-600",
                    )}
                  >
                    {mv.type === "SORTIE" ? "−" : "+"}
                    {formatQuantite(mv.quantite, mv.produit.unite)}
                  </td>
                  <td className="px-5 py-3.5 text-gray-400 italic text-xs max-w-[200px] truncate">
                    {mv.note ?? "—"}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 text-xs">
                    {mv.utilisateur.nom}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            ← Précédent
          </button>
          <span className="text-sm text-gray-600">
            Page {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sous-composant : Tableau des stocks actuels (RF-16)
// ─────────────────────────────────────────────────────────────

function StocksTable({ stocks }: { stocks: StockProduit[] }) {
  if (stocks.length === 0) {
    return <EmptyState message="Aucun produit actif." />;
  }

  const maxStock = Math.max(...stocks.map((s) => s.stockActuel), 1);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide bg-gray-50">
              <th className="text-left px-5 py-3">Produit</th>
              <th className="text-left px-5 py-3 hidden sm:table-cell">Catégorie</th>
              <th className="text-right px-5 py-3 text-emerald-600">Entrées</th>
              <th className="text-right px-5 py-3 text-red-500">Sorties</th>
              <th className="text-right px-5 py-3">Stock actuel</th>
              <th className="px-5 py-3 w-28 hidden md:table-cell"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {stocks.map((s) => {
              const pct = Math.round(
                (Math.max(s.stockActuel, 0) / maxStock) * 100
              );
              const stockCritique = s.stockActuel <= 0;

              return (
                <tr
                  key={s.produitId}
                  className={cls(
                    "transition-colors",
                    stockCritique ? "bg-red-50" : "hover:bg-gray-50",
                  )}
                >
                  <td className="px-5 py-3.5 font-medium text-gray-800">
                    {s.nomProduit}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 hidden sm:table-cell text-xs">
                    {s.categorieNom}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-emerald-600 text-xs">
                    +{s.totalEntrees.toFixed(2)}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-red-500 text-xs">
                    −{s.totalSorties.toFixed(2)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span
                      className={cls(
                        "font-bold font-mono text-base",
                        stockCritique
                          ? "text-red-600"
                          : s.stockActuel < 10
                            ? "text-amber-600"
                            : "text-gray-900",
                      )}
                    >
                      {stockCritique && "⚠ "}
                      {s.stockActuel.toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">{s.unite}</span>
                  </td>
                  {/* Barre de stock */}
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={cls(
                          "h-2.5 rounded-full transition-all",
                          stockCritique ? "bg-red-400" : "bg-indigo-400",
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sous-composant : État vide
// ─────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-16 text-center">
      <p className="text-4xl mb-3" aria-hidden>
        📭
      </p>
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  );
}
