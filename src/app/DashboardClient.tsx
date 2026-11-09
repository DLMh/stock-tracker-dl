"use client";

// ─────────────────────────────────────────────────────────────
// DashboardClient – Interface interactive du Tableau de Bord
// RF-18 : Export CSV / Excel
// RF-19 : Résumé du jour et de la semaine (entrées / sorties)
// RF-20 : Produits les plus sortis
// Design mobile-first et responsive avec Tailwind CSS
// ─────────────────────────────────────────────────────────────

import { useState, useTransition } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  type DashboardData,
  getDashboardDataAction,
  getExportDataAction,
  type ExportRow,
} from "./actions";

interface DashboardClientProps {
  initialData: DashboardData;
}

export function DashboardClient({ initialData }: DashboardClientProps) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [vuePeriode, setVuePeriode] = useState<"jour" | "semaine">("jour");
  const [isExporting, startExportTransition] = useTransition();
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportPeriode, setExportPeriode] = useState<
    "aujourd_hui" | "semaine" | "mois" | "tout"
  >("semaine");
  const [exportFormat, setExportFormat] = useState<"excel" | "csv">("excel");
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);

  // ── Rafraîchir les données ──
  const handleRefresh = () => {
    startRefreshTransition(async () => {
      const updated = await getDashboardDataAction();
      setData(updated);
    });
  };

  // ── Téléchargement de fichier ──
  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Génération Excel (.xlsx) et CSV (.csv) ──
  const handleExport = () => {
    startExportTransition(async () => {
      try {
        const rows: ExportRow[] = await getExportDataAction(exportPeriode);

        if (rows.length === 0) {
          alert("Aucun mouvement trouvé pour cette période.");
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

        if (exportFormat === "excel") {
          // ── 1. Vrai classeur Excel natif (.xlsx) ──
          const worksheetData = [
            headers,
            ...rows.map((r) => [
              r.date,
              r.type,
              r.produit,
              r.categorie,
              r.quantite, // Nombre réel (permet =SOMME(), graphiques, etc.)
              r.unite,
              r.note,
              r.saisiPar,
            ]),
          ];

          const ws = XLSX.utils.aoa_to_sheet(worksheetData);

          // Ajustement des largeurs de colonnes pour une lisibilité optimale
          ws["!cols"] = [
            { wch: 20 }, // Date et Heure
            { wch: 14 }, // Type
            { wch: 28 }, // Produit
            { wch: 22 }, // Catégorie
            { wch: 14 }, // Quantité
            { wch: 10 }, // Unité
            { wch: 32 }, // Note
            { wch: 18 }, // Saisi par
          ];

          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Mouvements");

          const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
          const blob = new Blob([excelBuffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          });

          const filename = `mouvements_stock_${exportPeriode}_${dateSuffix}.xlsx`;
          triggerDownload(blob, filename);
        } else {
          // ── 2. Format CSV standard (.csv) avec assainissement anti-injection ──
          const sanitizeCsvCell = (val: string | number) => {
            let str = String(val ?? "").trim();
            // Neutralisation de formule malveillante (=, +, -, @)
            if (/^[=+@-]/.test(str)) {
              str = `'` + str;
            }
            return `"${str.replace(/"/g, '""')}"`;
          };

          const csvLines = [
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

          // UTF-8 BOM (\uFEFF) essentiel pour ouvrir les accents correctement
          const csvContent = "\uFEFF" + csvLines.join("\r\n");
          const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;",
          });

          const filename = `mouvements_stock_${exportPeriode}_${dateSuffix}.csv`;
          triggerDownload(blob, filename);
        }

        setShowExportModal(false);
        setExportSuccessMsg("Export téléchargé avec succès !");
        setTimeout(() => setExportSuccessMsg(null), 4000);
      } catch (err) {
        console.error(err);
        alert("Erreur lors de l'export des données.");
      }
    });
  };

  const currentKpi =
    vuePeriode === "jour" ? data.resumeJour : data.resumeSemaine;
  const netMouvement = currentKpi.totalEntrees - currentKpi.totalSorties;

  // Calcul du max pour la barre relative des produits les plus sortis
  const maxSortie = data.topProduits.length > 0
    ? Math.max(...data.topProduits.map((p) => p.totalSorti), 1)
    : 1;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">
      {/* ── En-tête du Dashboard ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Tableau de bord
            </h1>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Rafraîchir les données"
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <svg
                className={`w-5 h-5 ${isRefreshing ? "animate-spin text-indigo-600" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Suivi des flux de stock en temps réel · Fuseau UTC+3 (Antananarivo)
          </p>
        </div>

        {/* Boutons d'actions rapides */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 font-semibold text-sm shadow-sm transition-all active:scale-95 touch-manipulation"
          >
            <svg
              className="w-4 h-4 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span>Exporter CSV / Excel</span>
          </button>

          <Link
            href="/saisie"
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold text-sm shadow-sm shadow-emerald-200 transition-all active:scale-95"
          >
            <span>+</span> Saisir mouvement
          </Link>
        </div>
      </div>

      {/* Message de succès export */}
      {exportSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 animate-in fade-in">
          <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {exportSuccessMsg}
        </div>
      )}

      {/* ── Alerte stock critique (si présent) ── */}
      {data.nbProduitsStockNegatif > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-amber-900">
              Attention : {data.nbProduitsStockNegatif} produit(s) en rupture ou stock négatif
            </h4>
            <p className="text-xs text-amber-700 mt-0.5">
              Certains produits ont un stock nul ou négatif suite aux dernières sorties. Consultez la liste pour effectuer un ajustement.
            </p>
          </div>
          <Link
            href="/historique"
            className="text-xs font-bold text-amber-900 bg-amber-200/70 hover:bg-amber-200 px-3 py-1.5 rounded-lg whitespace-nowrap self-center"
          >
            Vérifier
          </Link>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          SECTION 1 : RÉSUMÉ DES MOUVEMENTS (RF-19)
      ══════════════════════════════════════════════════════ */}
      <section className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5 sm:p-6 flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span>Flux de mouvements</span>
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                RF-19
              </span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Quantités physiques consolidées
            </p>
          </div>

          {/* Sélecteur de période Jour / Semaine */}
          <div className="inline-flex self-start sm:self-auto p-1 rounded-xl bg-gray-100 border border-gray-200">
            <button
              onClick={() => setVuePeriode("jour")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                vuePeriode === "jour"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Aujourd'hui
            </button>
            <button
              onClick={() => setVuePeriode("semaine")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                vuePeriode === "semaine"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Cette semaine (ISO)
            </button>
          </div>
        </div>

        {/* 3 Cartes KPI principales */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* 1. Total Entré */}
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100/80 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Total Entré
              </span>
              <span className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-sm font-bold shadow-sm shadow-emerald-200">
                +
              </span>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-extrabold text-emerald-700 tracking-tight">
                +{currentKpi.totalEntrees.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] font-medium text-emerald-600 mt-0.5">
                Quantité physique ajoutée
              </p>
            </div>
          </div>

          {/* 2. Total Sorti */}
          <div className="p-4 rounded-2xl bg-red-50/60 border border-red-100/80 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-red-800">
                Total Sorti
              </span>
              <span className="w-7 h-7 rounded-lg bg-red-500 text-white flex items-center justify-center text-sm font-bold shadow-sm shadow-red-200">
                −
              </span>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-extrabold text-red-700 tracking-tight">
                −{currentKpi.totalSorties.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] font-medium text-red-600 mt-0.5">
                Quantité physique retirée
              </p>
            </div>
          </div>

          {/* 3. Variation Nette */}
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
                Variation Nette
              </span>
              <span className="text-xs px-2 py-0.5 rounded-md font-semibold bg-gray-200 text-gray-700">
                {currentKpi.nbMouvements} saisie(s)
              </span>
            </div>
            <div className="mt-3">
              <p
                className={`text-3xl font-extrabold tracking-tight ${
                  netMouvement >= 0 ? "text-indigo-600" : "text-amber-600"
                }`}
              >
                {netMouvement >= 0 ? "+" : ""}
                {netMouvement.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] font-medium text-gray-500 mt-0.5">
                Entrées − Sorties
              </p>
            </div>
          </div>
        </div>

        {/* Comparatif Jour vs Semaine discret */}
        <div className="grid grid-cols-2 gap-3 pt-2 text-xs text-gray-500 border-t border-gray-100">
          <div>
            Aujourd'hui :{" "}
            <strong className="text-gray-800">
              +{data.resumeJour.totalEntrees.toFixed(1)} / −{data.resumeJour.totalSorties.toFixed(1)}
            </strong>{" "}
            ({data.resumeJour.nbMouvements} mvt)
          </div>
          <div className="text-right">
            Semaine en cours :{" "}
            <strong className="text-gray-800">
              +{data.resumeSemaine.totalEntrees.toFixed(1)} / −{data.resumeSemaine.totalSorties.toFixed(1)}
            </strong>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 2 : PRODUITS LES PLUS SORTIS (RF-20)
      ══════════════════════════════════════════════════════ */}
      <section className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span>Produits les plus sortis</span>
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100">
                RF-20
              </span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Top des sorties cumulées sur la semaine
            </p>
          </div>
          <span className="text-xs font-semibold text-gray-400">
            {data.topProduits.length} produit(s)
          </span>
        </div>

        {data.topProduits.length === 0 ? (
          <div className="text-center py-8 px-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <p className="text-2xl mb-1">📦</p>
            <p className="text-sm font-semibold text-gray-700">
              Aucune sortie enregistrée cette semaine
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Les produits les plus demandés apparaîtront automatiquement ici dès qu'une sortie sera saisie.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {data.topProduits.map((item, idx) => {
              const pct = Math.round((item.totalSorti / maxSortie) * 100);
              return (
                <div
                  key={item.produitId}
                  className="p-3.5 rounded-2xl bg-gray-50/70 hover:bg-gray-50 border border-gray-100 transition-colors flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          idx === 0
                            ? "bg-amber-400 text-amber-950 font-black shadow-sm"
                            : idx === 1
                            ? "bg-gray-300 text-gray-900"
                            : idx === 2
                            ? "bg-amber-600 text-white"
                            : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">
                          {item.nomProduit}
                        </p>
                        <p className="text-[11px] text-gray-400 truncate">
                          {item.categorieNom} · {item.nbMouvements} sortie(s)
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-base font-extrabold text-red-600 font-mono">
                        −{item.totalSorti.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs font-medium text-gray-500 ml-1">
                        {item.unite}
                      </span>
                    </div>
                  </div>

                  {/* Barre visuelle relative */}
                  <div className="w-full bg-gray-200/80 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-red-400 to-red-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(pct, 5)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 3 : DERNIÈRES OPÉRATIONS (FIL D'ACTIVITÉ)
      ══════════════════════════════════════════════════════ */}
      <section className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Derniers mouvements enregistrés
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Historique récent saisi dans l'application
            </p>
          </div>
          <Link
            href="/historique"
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
          >
            <span>Voir tout</span>
            <span>→</span>
          </Link>
        </div>

        {data.derniersMouvements.length === 0 ? (
          <p className="text-xs text-gray-400 italic text-center py-4">
            Aucun mouvement enregistré pour le moment.
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {data.derniersMouvements.map((m) => (
              <div
                key={m.id}
                className="py-3 flex items-center justify-between gap-3 text-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      m.type === "ENTREE"
                        ? "bg-emerald-100 text-emerald-700"
                        : m.type === "SORTIE"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {m.type === "ENTREE" ? "+" : m.type === "SORTIE" ? "−" : "⚖"}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {m.produitNom}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate">
                      {new Date(m.dateMouvement).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · Saisi par {m.utilisateurNom}
                      {m.note ? ` · « ${m.note} »` : ""}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`font-mono font-bold ${
                      m.type === "SORTIE" ? "text-red-600" : "text-emerald-600"
                    }`}
                  >
                    {m.type === "SORTIE" ? "−" : "+"}
                    {m.quantite.toLocaleString("fr-FR", { maximumFractionDigits: 3 })}
                  </span>{" "}
                  <span className="text-xs text-gray-500">{m.produitUnite}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════
          MODAL D'EXPORTATION (RF-18)
      ══════════════════════════════════════════════════════ */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  ↓
                </div>
                <h3 className="font-bold text-lg text-gray-900">
                  Exporter les mouvements
                </h3>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                ✕
              </button>
            </div>

            {/* Choix de la période */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Période à exporter
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "aujourd_hui", label: "Aujourd'hui" },
                  { id: "semaine", label: "Cette semaine" },
                  { id: "mois", label: "Mois en cours" },
                  { id: "tout", label: "Tout l'historique" },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setExportPeriode(p.id as typeof exportPeriode)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-left ${
                      exportPeriode === p.id
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Choix du format */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Format du fichier
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExportFormat("excel")}
                  className={`p-3 rounded-xl text-left border flex flex-col gap-1 transition-all ${
                    exportFormat === "excel"
                      ? "border-emerald-600 bg-emerald-50/70 text-emerald-950 shadow-sm ring-2 ring-emerald-500/20"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <span className="text-emerald-600 font-black">📊</span> Excel (.xlsx)
                  </span>
                  <span className="text-[11px] text-gray-500">
                    Classeur Microsoft Excel natif avec colonnes dimensionnées
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setExportFormat("csv")}
                  className={`p-3 rounded-xl text-left border flex flex-col gap-1 transition-all ${
                    exportFormat === "csv"
                      ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 shadow-sm ring-2 ring-indigo-500/20"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <span className="text-indigo-600 font-black">📄</span> CSV (.csv)
                  </span>
                  <span className="text-[11px] text-gray-500">
                    Fichier texte standard délimité avec encodage UTF-8 universel
                  </span>
                </button>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-200 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    <span>Génération...</span>
                  </>
                ) : (
                  <>
                    <span>Télécharger</span>
                    <span>↓</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
