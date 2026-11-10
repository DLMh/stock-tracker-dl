"use client";

// ─────────────────────────────────────────────────────────────
// MouvementForm — Formulaire de saisie de mouvement de stock
//
// Basé sur :
//   • resumeCC.md         (RF-06, RF-07, RF-08, RF-09, RF-10, RG-02, RG-04, RG-06)
//   • schema.prisma       (Mouvement, TypeMouvement)
//   • lib/validations/movement.ts
//   • lib/timezone.ts
//
// Design :
//   • Mobile-first avec grands éléments tactiles (min 48px)
//   • Bouton ENTRÉE (vert) / SORTIE (rouge) visuellement distincts
//   • Sélecteur de produit avec recherche rapide (RF-08)
//   • Date par défaut = aujourd'hui heure Antananarivo (RF-09, RG-04)
// ─────────────────────────────────────────────────────────────

import { useState, useMemo, useTransition, type FormEvent } from "react";
import { nowDateTimeString } from "@/lib/timezone";
import { mouvementSchema } from "@/lib/validations/movement";

// ─── Types ───────────────────────────────────────────────────

export interface ProduitOption {
  id: string;
  nom: string;
  unite: string;
  /** Chemin d'affichage : "Catégorie > Sous-catégorie > Produit" */
  chemin?: string;
}

export interface MouvementFormValues {
  produitId: string;
  type: "ENTREE" | "SORTIE";
  quantite: number;
  dateMouvement: string; // YYYY-MM-DD
  note?: string;
}

export interface MouvementFormProps {
  produits: ProduitOption[];
  /** Appelé avec les valeurs validées à la soumission */
  onSubmit: (values: MouvementFormValues) => Promise<void>;
  /** Stock actuel du produit sélectionné (pour l'avertissement RG-02) */
  onProduitChange?: (produitId: string) => Promise<number | null>;
}

// ─── Helpers ─────────────────────────────────────────────────

function cls(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

// ─── Composant ───────────────────────────────────────────────

export function MouvementForm({
  produits,
  onSubmit,
  onProduitChange,
}: MouvementFormProps) {
  // ── État du formulaire ──
  const [type, setType] = useState<"ENTREE" | "SORTIE">("ENTREE");
  const [produitId, setProduitId] = useState("");
  const [recherche, setRecherche] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [quantite, setQuantite] = useState("");
  const [date, setDate] = useState(nowDateTimeString());
  const [note, setNote] = useState("");
  const [stockActuel, setStockActuel] = useState<number | null>(null);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [succes, setSucces] = useState(false);
  const [isPending, startTransition] = useTransition();

  // ── Produit sélectionné ──
  const produitSelectionne = useMemo(
    () => produits.find((p) => p.id === produitId) ?? null,
    [produits, produitId],
  );

  // ── Filtrage du sélecteur par la recherche ──
  const produitsFiltres = useMemo(() => {
    const q = recherche.toLowerCase().trim();
    if (!q) return produits.slice(0, 30); // Limite d'affichage initial
    return produits
      .filter(
        (p) =>
          p.nom.toLowerCase().includes(q) ||
          p.chemin?.toLowerCase().includes(q),
      )
      .slice(0, 30);
  }, [produits, recherche]);

  // ── Sélection d'un produit ──
  async function choisirProduit(p: ProduitOption) {
    setProduitId(p.id);
    setRecherche(p.nom);
    setShowDropdown(false);
    setErreurs((prev) => ({ ...prev, produitId: "" }));
    setStockActuel(null);
    if (onProduitChange) {
      const stock = await onProduitChange(p.id);
      setStockActuel(stock);
    }
  }

  // ── Validation et soumission ──
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSucces(false);

    const raw = {
      produitId,
      type,
      quantite: parseFloat(quantite),
      dateMouvement: date,
      note: note.trim() || undefined,
    };

    const result = mouvementSchema.safeParse(raw);

    if (!result.success) {
      const map: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        const key = String(err.path[0] ?? "global");
        map[key] = err.message;
      });
      setErreurs(map);
      return;
    }

    // Avertissement RG-02 (stock insuffisant) — non bloquant côté formulaire,
    // le service côté serveur lancera une erreur si le stock est réellement insuffisant.
    setErreurs({});

    startTransition(async () => {
      try {
        await onSubmit(result.data as MouvementFormValues);
        // Réinitialisation après succès
        setQuantite("");
        setNote("");
        setDate(nowDateTimeString());
        setSucces(true);
        setTimeout(() => setSucces(false), 4000);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Une erreur est survenue.";
        setErreurs({ global: message });
      }
    });
  }

  // ─────────────────────────────────────────────────────────
  // RENDU
  // ─────────────────────────────────────────────────────────
  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="w-full max-w-lg mx-auto flex flex-col gap-6 px-4 py-6"
    >
      {/* ── Titre ── */}
      <h2 className="text-xl font-bold text-gray-900 text-center tracking-tight">
        Saisir un mouvement
      </h2>

      {/* ══════════════════════════════════════════════════
          1. CHOIX ENTRÉE / SORTIE — boutons larges tactiles
          RF-06, RF-07 | Design mobile-first
      ══════════════════════════════════════════════════ */}
      <div
        role="group"
        aria-label="Type de mouvement"
        className="grid grid-cols-2 gap-3"
      >
        <button
          type="button"
          onClick={() => setType("ENTREE")}
          aria-pressed={type === "ENTREE"}
          className={cls(
            "flex flex-col items-center justify-center gap-1 rounded-2xl py-5 px-4",
            "text-lg font-bold transition-all duration-150 select-none",
            "min-h-[80px] touch-manipulation border-2",
            type === "ENTREE"
              ? "bg-emerald-500 border-emerald-600 text-white shadow-lg shadow-emerald-200 scale-[1.02]"
              : "bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50 active:scale-95",
          )}
        >
          <span className="text-3xl" aria-hidden="true">
            +
          </span>
          <span className="text-sm font-semibold uppercase tracking-wide">
            Entrée
          </span>
        </button>

        <button
          type="button"
          onClick={() => setType("SORTIE")}
          aria-pressed={type === "SORTIE"}
          className={cls(
            "flex flex-col items-center justify-center gap-1 rounded-2xl py-5 px-4",
            "text-lg font-bold transition-all duration-150 select-none",
            "min-h-[80px] touch-manipulation border-2",
            type === "SORTIE"
              ? "bg-red-500 border-red-600 text-white shadow-lg shadow-red-200 scale-[1.02]"
              : "bg-white border-red-200 text-red-700 hover:bg-red-50 active:scale-95",
          )}
        >
          <span className="text-3xl" aria-hidden="true">
            −
          </span>
          <span className="text-sm font-semibold uppercase tracking-wide">
            Sortie
          </span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════
          2. SÉLECTEUR DE PRODUIT avec recherche rapide
          RF-08 : saisie rapide | RF-04 : recherche par nom
      ══════════════════════════════════════════════════ */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="recherche-produit"
          className="text-sm font-medium text-gray-700"
        >
          Produit <span className="text-red-500">*</span>
        </label>

        <div className="relative">
          <input
            id="recherche-produit"
            type="search"
            autoComplete="off"
            value={recherche}
            onChange={(e) => {
              setRecherche(e.target.value);
              setProduitId("");
              setStockActuel(null);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            placeholder="Rechercher un produit…"
            className={cls(
              "w-full rounded-xl border px-4 py-3.5 text-base",
              "placeholder:text-gray-400 outline-none transition",
              "focus:ring-2 focus:ring-offset-1",
              erreurs.produitId
                ? "border-red-400 focus:ring-red-300"
                : "border-gray-300 focus:ring-emerald-400 focus:border-emerald-400",
            )}
          />

          {/* Icône loupe */}
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </span>

          {/* Dropdown */}
          {showDropdown && produitsFiltres.length > 0 && (
            <ul
              role="listbox"
              className="absolute z-50 w-full mt-1 max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl divide-y divide-gray-100"
            >
              {produitsFiltres.map((p) => (
                <li
                  key={p.id}
                  role="option"
                  aria-selected={p.id === produitId}
                  onMouseDown={() => choisirProduit(p)}
                  className={cls(
                    "flex flex-col px-4 py-3 cursor-pointer transition-colors",
                    p.id === produitId
                      ? "bg-emerald-50 text-emerald-800"
                      : "hover:bg-gray-50 text-gray-800",
                  )}
                >
                  <span className="font-medium">{p.nom}</span>
                  {p.chemin && (
                    <span className="text-xs text-gray-400 mt-0.5">
                      {p.chemin}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    Unité : {p.unite}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {showDropdown &&
            recherche.length > 0 &&
            produitsFiltres.length === 0 && (
              <div className="absolute z-50 w-full mt-1 rounded-xl border border-gray-200 bg-white shadow-xl px-4 py-3 text-sm text-gray-500">
                Aucun produit trouvé pour « {recherche} »
              </div>
            )}
        </div>

        {erreurs.produitId && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <span aria-hidden>⚠</span> {erreurs.produitId}
          </p>
        )}

        {/* Avertissement stock insuffisant (RG-02) */}
        {type === "SORTIE" &&
          stockActuel !== null &&
          parseFloat(quantite) > stockActuel && (
            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2">
              <span aria-hidden>⚠️</span>
              Stock actuel : {stockActuel}{" "}
              {produitSelectionne?.unite ?? "unité(s)"} — la sortie demandée
              dépasse le stock disponible.
            </p>
          )}

        {/* Info stock actuel */}
        {stockActuel !== null && (
          <p className="text-xs text-gray-500">
            Stock actuel : <strong>{stockActuel}</strong>{" "}
            {produitSelectionne?.unite ?? ""}
          </p>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          3. QUANTITÉ — grand champ numérique (RF-10)
      ══════════════════════════════════════════════════ */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="quantite" className="text-sm font-medium text-gray-700">
          Quantité{" "}
          {produitSelectionne && (
            <span className="text-gray-400 font-normal">
              ({produitSelectionne.unite})
            </span>
          )}{" "}
          <span className="text-red-500">*</span>
        </label>

        <input
          id="quantite"
          type="number"
          inputMode="decimal"
          min="0.001"
          step="any"
          value={quantite}
          onChange={(e) => {
            setQuantite(e.target.value);
            setErreurs((prev) => ({ ...prev, quantite: "" }));
          }}
          placeholder="0"
          className={cls(
            "w-full rounded-xl border px-4 py-3.5 text-2xl font-bold text-center",
            "placeholder:text-gray-300 outline-none transition",
            "focus:ring-2 focus:ring-offset-1",
            erreurs.quantite
              ? "border-red-400 focus:ring-red-300"
              : type === "ENTREE"
                ? "border-emerald-300 focus:ring-emerald-400 focus:border-emerald-400"
                : "border-red-300 focus:ring-red-400 focus:border-red-400",
          )}
        />

        {erreurs.quantite && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <span aria-hidden>⚠</span> {erreurs.quantite}
          </p>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          4. DATE + NOTE — ligne adaptée mobile/desktop
          RF-09 : date par défaut = aujourd'hui | RG-04 : UTC+3
      ══════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Date et heure */}
        <div className="flex flex-col gap-1.5 flex-1">
          <label htmlFor="date" className="text-sm font-medium text-gray-700">
            Date et heure <span className="text-red-500">*</span>
          </label>
          <input
            id="date"
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={cls(
              "w-full rounded-xl border border-gray-300 px-4 py-3.5 text-base",
              "outline-none transition focus:ring-2 focus:ring-offset-1 focus:ring-emerald-400 focus:border-emerald-400",
            )}
          />
          {erreurs.dateMouvement && (
            <p className="text-sm text-red-500">{erreurs.dateMouvement}</p>
          )}
        </div>

        {/* Note facultative */}
        <div className="flex flex-col gap-1.5 flex-[2]">
          <label htmlFor="note" className="text-sm font-medium text-gray-700">
            Note{" "}
            <span className="text-gray-400 font-normal">(facultative)</span>
          </label>
          <input
            id="note"
            type="text"
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex. : livraison fournisseur A"
            className="w-full rounded-xl border border-gray-300 px-4 py-3.5 text-base outline-none transition focus:ring-2 focus:ring-offset-1 focus:ring-emerald-400 focus:border-emerald-400 placeholder:text-gray-300"
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          5. ERREUR GLOBALE
      ══════════════════════════════════════════════════ */}
      {erreurs.global && (
        <div
          role="alert"
          className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-start gap-2"
        >
          <span className="mt-0.5" aria-hidden>
            ✖
          </span>
          <span>{erreurs.global}</span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          6. MESSAGE DE SUCCÈS
      ══════════════════════════════════════════════════ */}
      {succes && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2"
        >
          <span aria-hidden>✓</span>
          Mouvement enregistré avec succès.
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          7. BOUTON SOUMETTRE — grand, couleur selon type
      ══════════════════════════════════════════════════ */}
      <button
        type="submit"
        disabled={isPending}
        className={cls(
          "w-full rounded-2xl py-4 px-6 text-lg font-bold text-white",
          "transition-all duration-150 touch-manipulation min-h-[60px]",
          "disabled:opacity-60 disabled:cursor-not-allowed",
          type === "ENTREE"
            ? "bg-emerald-500 hover:bg-emerald-600 active:scale-95 shadow-lg shadow-emerald-200"
            : "bg-red-500 hover:bg-red-600 active:scale-95 shadow-lg shadow-red-200",
        )}
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="animate-spin w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"
              />
            </svg>
            Enregistrement…
          </span>
        ) : type === "ENTREE" ? (
          "✚ Enregistrer l'entrée"
        ) : (
          "− Enregistrer la sortie"
        )}
      </button>
    </form>
  );
}
