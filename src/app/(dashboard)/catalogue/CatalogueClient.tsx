"use client";

// ─────────────────────────────────────────────────────────────
// CatalogueClient – Interface CRUD Catalogue Hiérarchique
// Catégorie > Sous-catégorie > Produit
// RF-01, RF-02, RF-03, RF-04, RF-05, RG-06
// Design mobile-first et responsive avec Tailwind CSS v4
// ─────────────────────────────────────────────────────────────

import { useState, useMemo, useTransition } from "react";
import {
  type CatalogueData,
  type ProduitCatalogue,
  type CategorieCatalogue,
  creerCategorieAction,
  modifierCategorieAction,
  toggleActifCategorieAction,
  supprimerCategorieAction,
  creerProduitAction,
  modifierProduitAction,
  toggleActifProduitAction,
  supprimerProduitAction,
  getCatalogueDataAction,
} from "./actions";
import { UNITES_AUTORISEES } from "@/lib/validations/product";

interface CatalogueClientProps {
  initialData: CatalogueData;
  defaultTab?: "arborescence" | "produits" | "categories";
}

export function CatalogueClient({
  initialData,
  defaultTab = "arborescence",
}: CatalogueClientProps) {
  const [data, setData] = useState<CatalogueData>(initialData);
  const [onglet, setOnglet] = useState<"arborescence" | "produits" | "categories">(defaultTab);
  const [recherche, setRecherche] = useState("");
  const [masquerInactifs, setMasquerInactifs] = useState(false);
  const [isPending, startTransition] = useTransition();

  // ── Modals État ──
  const [modalCatOuvert, setModalCatOuvert] = useState(false);
  const [catEnEdition, setCatEnEdition] = useState<{
    id?: string;
    nom: string;
    parentId?: string | null;
    actif?: boolean;
  } | null>(null);

  const [modalProdOuvert, setModalProdOuvert] = useState(false);
  const [prodEnEdition, setProdEnEdition] = useState<{
    id?: string;
    nom: string;
    categorieId: string;
    unite: string;
    actif?: boolean;
  } | null>(null);

  const [modalSuppr, setModalSuppr] = useState<{
    type: "categorie" | "produit";
    id: string;
    nom: string;
    nbMouvements?: number;
  } | null>(null);

  const [messageAlerte, setMessageAlerte] = useState<{
    type: "succes" | "erreur";
    texte: string;
  } | null>(null);

  // ── Catégories dépliées dans l'arborescence ──
  const [categoriesDepliees, setCategoriesDepliees] = useState<Record<string, boolean>>({});

  const toggleDepliage = (id: string) => {
    setCategoriesDepliees((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const afficherMessage = (texte: string, type: "succes" | "erreur" = "succes") => {
    setMessageAlerte({ texte, type });
    setTimeout(() => setMessageAlerte(null), 5000);
  };

  const rafraichirDonnees = () => {
    startTransition(async () => {
      const maj = await getCatalogueDataAction();
      setData(maj);
    });
  };

  // ── Filtrage Produits ──
  const produitsFiltres = useMemo(() => {
    const q = recherche.toLowerCase().trim();
    return data.tousProduits.filter((p) => {
      if (masquerInactifs && !p.actif) return false;
      if (!q) return true;
      return (
        p.nom.toLowerCase().includes(q) ||
        p.cheminComplet.toLowerCase().includes(q) ||
        p.unite.toLowerCase().includes(q)
      );
    });
  }, [data.tousProduits, recherche, masquerInactifs]);

  // ── Filtrage Catégories ──
  const categoriesFiltrees = useMemo(() => {
    const q = recherche.toLowerCase().trim();
    return data.toutesCategories.filter((c) => {
      if (!q) return true;
      return c.nom.toLowerCase().includes(q) || c.chemin.toLowerCase().includes(q);
    });
  }, [data.toutesCategories, recherche]);

  // ── Gestion Soumission Catégorie ──
  const soumettreCategorie = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catEnEdition || !catEnEdition.nom.trim()) return;

    startTransition(async () => {
      if (catEnEdition.id) {
        const res = await modifierCategorieAction({
          id: catEnEdition.id,
          nom: catEnEdition.nom,
          parentId: catEnEdition.parentId ?? null,
          actif: catEnEdition.actif,
        });
        if (res.success) {
          afficherMessage("Catégorie modifiée avec succès.");
          setModalCatOuvert(false);
          rafraichirDonnees();
        } else {
          afficherMessage(res.error || "Erreur lors de la modification", "erreur");
        }
      } else {
        const res = await creerCategorieAction({
          nom: catEnEdition.nom,
          parentId: catEnEdition.parentId ?? null,
        });
        if (res.success) {
          afficherMessage("Catégorie créée avec succès.");
          setModalCatOuvert(false);
          rafraichirDonnees();
        } else {
          afficherMessage(res.error || "Erreur lors de la création", "erreur");
        }
      }
    });
  };

  // ── Gestion Soumission Produit ──
  const soumettreProduit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodEnEdition || !prodEnEdition.nom.trim() || !prodEnEdition.categorieId) return;

    startTransition(async () => {
      if (prodEnEdition.id) {
        const res = await modifierProduitAction({
          id: prodEnEdition.id,
          nom: prodEnEdition.nom,
          categorieId: prodEnEdition.categorieId,
          unite: prodEnEdition.unite,
          actif: prodEnEdition.actif,
        });
        if (res.success) {
          afficherMessage("Produit modifié avec succès.");
          setModalProdOuvert(false);
          rafraichirDonnees();
        } else {
          afficherMessage(res.error || "Erreur lors de la modification", "erreur");
        }
      } else {
        const res = await creerProduitAction({
          nom: prodEnEdition.nom,
          categorieId: prodEnEdition.categorieId,
          unite: prodEnEdition.unite,
        });
        if (res.success) {
          afficherMessage("Produit créé avec succès.");
          setModalProdOuvert(false);
          rafraichirDonnees();
        } else {
          afficherMessage(res.error || "Erreur lors de la création", "erreur");
        }
      }
    });
  };

  // ── Exécution de la suppression ──
  const executerSuppression = () => {
    if (!modalSuppr) return;

    startTransition(async () => {
      if (modalSuppr.type === "categorie") {
        const res = await supprimerCategorieAction(modalSuppr.id);
        if (res.success) {
          afficherMessage(`Catégorie « ${modalSuppr.nom} » supprimée.`);
          setModalSuppr(null);
          rafraichirDonnees();
        } else {
          afficherMessage(res.error || "Erreur de suppression", "erreur");
        }
      } else {
        const res = await supprimerProduitAction(modalSuppr.id);
        if (res.success) {
          afficherMessage(`Produit « ${modalSuppr.nom} » supprimé.`);
          setModalSuppr(null);
          rafraichirDonnees();
        } else {
          afficherMessage(res.error || "Erreur de suppression", "erreur");
        }
      }
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">
      {/* ── En-tête de la page ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Catalogue & Produits
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Organisation hiérarchique : Catégories › Sous-catégories › Produits
          </p>
        </div>

        {/* Boutons d'ajouts principaux */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCatEnEdition({ nom: "", parentId: null, actif: true });
              setModalCatOuvert(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-semibold text-sm shadow-sm transition-all active:scale-95"
          >
            <span>+</span> Catégorie
          </button>
          <button
            onClick={() => {
              setProdEnEdition({
                nom: "",
                categorieId: data.toutesCategories[0]?.id || "",
                unite: "pièce",
                actif: true,
              });
              setModalProdOuvert(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold text-sm shadow-sm shadow-emerald-200 transition-all active:scale-95"
          >
            <span>+</span> Nouveau Produit
          </button>
        </div>
      </div>

      {/* ── Notification Feedback ── */}
      {messageAlerte && (
        <div
          className={`p-4 rounded-2xl border text-sm font-medium flex items-center justify-between gap-3 animate-in fade-in ${
            messageAlerte.type === "succes"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{messageAlerte.type === "succes" ? "✓" : "⚠"}</span>
            <span>{messageAlerte.texte}</span>
          </div>
          <button
            onClick={() => setMessageAlerte(null)}
            className="text-xs opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Résumé Chiffré Rapide ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-white border border-gray-200 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Catégories
          </p>
          <p className="text-2xl font-extrabold text-gray-900 mt-1">
            {data.categoriesRacines.length}
          </p>
        </div>
        <div className="p-3.5 rounded-2xl bg-white border border-gray-200 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Sous-catégories
          </p>
          <p className="text-2xl font-extrabold text-indigo-600 mt-1">
            {data.toutesCategories.length - data.categoriesRacines.length}
          </p>
        </div>
        <div className="p-3.5 rounded-2xl bg-white border border-gray-200 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Produits Actifs
          </p>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">
            {data.tousProduits.filter((p) => p.actif).length}
          </p>
        </div>
      </div>

      {/* ── Filtres & Onglets ── */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-4 sm:p-5 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Onglets de vue */}
          <div className="inline-flex p-1 rounded-xl bg-gray-100 border border-gray-200 self-start">
            <button
              onClick={() => setOnglet("arborescence")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                onglet === "arborescence"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              🌳 Arborescence
            </button>
            <button
              onClick={() => setOnglet("produits")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                onglet === "produits"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              📦 Produits ({data.tousProduits.length})
            </button>
            <button
              onClick={() => setOnglet("categories")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                onglet === "categories"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              📁 Catégories ({data.toutesCategories.length})
            </button>
          </div>

          {/* Bascule Actif / Tous */}
          <label className="flex items-center gap-2 text-xs font-medium text-gray-600 cursor-pointer self-start sm:self-auto select-none">
            <input
              type="checkbox"
              checked={masquerInactifs}
              onChange={(e) => setMasquerInactifs(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
            />
            <span>Masquer les éléments désactivés</span>
          </label>
        </div>

        {/* Barre de recherche */}
        <div className="relative">
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher une catégorie, sous-catégorie ou produit..."
            className="w-full rounded-xl border border-gray-300 bg-gray-50/50 px-4 py-2.5 pl-10 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
          />
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm">
            🔍
          </span>
          {recherche && (
            <button
              onClick={() => setRecherche("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 p-1"
            >
              Effacer
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          VUE 1 : ARBORESCENCE HIÉRARCHIQUE (RF-04)
      ══════════════════════════════════════════════════════ */}
      {onglet === "arborescence" && (
        <div className="flex flex-col gap-3">
          {data.categoriesRacines.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-gray-200">
              <p className="text-3xl mb-2">📁</p>
              <h3 className="font-bold text-gray-800">Catalogue vide</h3>
              <p className="text-xs text-gray-500 mt-1">
                Commencez par créer votre première catégorie principale (ex: *zezika*).
              </p>
            </div>
          ) : (
            data.categoriesRacines.map((catRacine) => {
              const estOuverte = categoriesDepliees[catRacine.id] ?? true;

              return (
                <div
                  key={catRacine.id}
                  className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden"
                >
                  {/* Ligne Catégorie Principale */}
                  <div className="p-4 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        onClick={() => toggleDepliage(catRacine.id)}
                        className="w-7 h-7 rounded-lg bg-gray-200/70 hover:bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-700 transition-transform"
                      >
                        {estOuverte ? "▼" : "▶"}
                      </button>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-gray-900 truncate">
                            {catRacine.nom}
                          </span>
                          {!catRacine.actif && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-200 text-gray-600">
                              Désactivée
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">
                          Catégorie principale · {catRacine.sousCategories.length} sous-catégorie(s)
                        </span>
                      </div>
                    </div>

                    {/* Actions sur Catégorie Principale */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          setCatEnEdition({
                            nom: "",
                            parentId: catRacine.id,
                            actif: true,
                          });
                          setModalCatOuvert(true);
                        }}
                        title="Ajouter une sous-catégorie"
                        className="px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-xs font-semibold text-indigo-600 flex items-center gap-1"
                      >
                        <span>+</span> <span className="hidden sm:inline">Sous-cat</span>
                      </button>
                      <button
                        onClick={() => {
                          setCatEnEdition({
                            id: catRacine.id,
                            nom: catRacine.nom,
                            parentId: null,
                            actif: catRacine.actif,
                          });
                          setModalCatOuvert(true);
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                        title="Modifier"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() =>
                          setModalSuppr({
                            type: "categorie",
                            id: catRacine.id,
                            nom: catRacine.nom,
                          })
                        }
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                        title="Supprimer"
                      >
                        🗑
                      </button>
                    </div>
                  </div>

                  {/* Contenu de la Catégorie (Sous-catégories et Produits) */}
                  {estOuverte && (
                    <div className="p-3 sm:p-5 flex flex-col gap-3">
                      {/* 1. Sous-catégories */}
                      {catRacine.sousCategories.length > 0 && (
                        <div className="flex flex-col gap-2.5 pl-2 sm:pl-4 border-l-2 border-indigo-100 ml-2 sm:ml-3">
                          {catRacine.sousCategories.map((sousCat) => {
                            // Trouver les produits appartenant à cette sous-catégorie
                            const prodsDeSousCat = data.tousProduits.filter(
                              (p) => p.categorieId === sousCat.id
                            );

                            return (
                              <div
                                key={sousCat.id}
                                className="p-3 rounded-2xl bg-gray-50/60 border border-gray-100 flex flex-col gap-2"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-indigo-600 font-bold text-xs">↳</span>
                                    <span className="font-bold text-sm text-gray-800">
                                      {sousCat.nom}
                                    </span>
                                    {!sousCat.actif && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-200 text-gray-600">
                                        Inactif
                                      </span>
                                    )}
                                    <span className="text-xs text-gray-400">
                                      ({prodsDeSousCat.length} produit{prodsDeSousCat.length > 1 ? "s" : ""})
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => {
                                        setProdEnEdition({
                                          nom: "",
                                          categorieId: sousCat.id,
                                          unite: "pièce",
                                          actif: true,
                                        });
                                        setModalProdOuvert(true);
                                      }}
                                      className="px-2 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs flex items-center gap-1"
                                      title="Ajouter un produit dans cette sous-catégorie"
                                    >
                                      <span>+ Produit</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        setCatEnEdition({
                                          id: sousCat.id,
                                          nom: sousCat.nom,
                                          parentId: catRacine.id,
                                          actif: sousCat.actif,
                                        });
                                        setModalCatOuvert(true);
                                      }}
                                      className="p-1 rounded text-gray-400 hover:text-gray-700"
                                      title="Modifier"
                                    >
                                      ✎
                                    </button>
                                    <button
                                      onClick={() =>
                                        setModalSuppr({
                                          type: "categorie",
                                          id: sousCat.id,
                                          nom: sousCat.nom,
                                        })
                                      }
                                      className="p-1 rounded text-gray-400 hover:text-red-600"
                                      title="Supprimer"
                                    >
                                      🗑
                                    </button>
                                  </div>
                                </div>

                                {/* Produits sous cette sous-catégorie */}
                                {prodsDeSousCat.length > 0 ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 pl-4">
                                    {prodsDeSousCat.map((p) => (
                                      <div
                                        key={p.id}
                                        className="p-2.5 rounded-xl bg-white border border-gray-200 flex items-center justify-between gap-2 shadow-2xs"
                                      >
                                        <div className="min-w-0">
                                          <p className="font-semibold text-xs text-gray-900 truncate">
                                            {p.nom}
                                          </p>
                                          <p className="text-[11px] text-gray-400">
                                            Stock :{" "}
                                            <strong
                                              className={
                                                p.stockActuel <= 0
                                                  ? "text-red-500"
                                                  : "text-emerald-600"
                                              }
                                            >
                                              {p.stockActuel} {p.unite}
                                            </strong>
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                          <button
                                            onClick={() => {
                                              setProdEnEdition({
                                                id: p.id,
                                                nom: p.nom,
                                                categorieId: p.categorieId,
                                                unite: p.unite,
                                                actif: p.actif,
                                              });
                                              setModalProdOuvert(true);
                                            }}
                                            className="p-1 rounded text-gray-400 hover:text-gray-700"
                                            title="Modifier"
                                          >
                                            ✎
                                          </button>
                                          <button
                                            onClick={() =>
                                              setModalSuppr({
                                                type: "produit",
                                                id: p.id,
                                                nom: p.nom,
                                                nbMouvements: p.nbMouvements,
                                              })
                                            }
                                            className="p-1 rounded text-gray-400 hover:text-red-600"
                                            title="Supprimer"
                                          >
                                            🗑
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-400 italic pl-4">
                                    Aucun produit dans cette sous-catégorie.
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* 2. Produits directement rattachés à la catégorie racine (si autorisé) */}
                      {catRacine.produits.length > 0 && (
                        <div className="flex flex-col gap-2 pl-2 sm:pl-4">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                            Produits directs :
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {catRacine.produits.map((p) => (
                              <div
                                key={p.id}
                                className="p-2.5 rounded-xl bg-white border border-gray-200 flex items-center justify-between gap-2 shadow-2xs"
                              >
                                <div className="min-w-0">
                                  <p className="font-semibold text-xs text-gray-900 truncate">
                                    {p.nom}
                                  </p>
                                  <p className="text-[11px] text-gray-400">
                                    Stock :{" "}
                                    <strong
                                      className={
                                        p.stockActuel <= 0
                                          ? "text-red-500"
                                          : "text-emerald-600"
                                      }
                                    >
                                      {p.stockActuel} {p.unite}
                                    </strong>
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => {
                                      setProdEnEdition({
                                        id: p.id,
                                        nom: p.nom,
                                        categorieId: catRacine.id,
                                        unite: p.unite,
                                        actif: p.actif,
                                      });
                                      setModalProdOuvert(true);
                                    }}
                                    className="p-1 rounded text-gray-400 hover:text-gray-700"
                                  >
                                    ✎
                                  </button>
                                  <button
                                    onClick={() =>
                                      setModalSuppr({
                                        type: "produit",
                                        id: p.id,
                                        nom: p.nom,
                                      })
                                    }
                                    className="p-1 rounded text-gray-400 hover:text-red-600"
                                  >
                                    🗑
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          VUE 2 : LISTE COMPLÈTE DES PRODUITS (RF-02)
      ══════════════════════════════════════════════════════ */}
      {onglet === "produits" && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider bg-gray-50/70">
                  <th className="py-3 px-4">Produit</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Catégorie</th>
                  <th className="py-3 px-4">Stock</th>
                  <th className="py-3 px-4 text-center">Statut</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {produitsFiltres.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400 text-sm">
                      Aucun produit trouvé.
                    </td>
                  </tr>
                ) : (
                  produitsFiltres.map((p) => (
                    <tr
                      key={p.id}
                      className={`hover:bg-gray-50/60 transition-colors ${
                        !p.actif ? "opacity-60 bg-gray-50/30" : ""
                      }`}
                    >
                      <td className="py-3 px-4">
                        <p className="font-bold text-gray-900">{p.nom}</p>
                        <p className="text-[11px] text-gray-400 sm:hidden">
                          {p.cheminComplet}
                        </p>
                      </td>
                      <td className="py-3 px-4 hidden sm:table-cell text-xs text-gray-500">
                        {p.parentCategorieNom && (
                          <span className="font-medium text-gray-400">
                            {p.parentCategorieNom} ›{" "}
                          </span>
                        )}
                        <span className="font-semibold text-gray-700">
                          {p.categorieNom}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-xs">
                        <span
                          className={
                            p.stockActuel <= 0 ? "text-red-500" : "text-emerald-700"
                          }
                        >
                          {p.stockActuel} {p.unite}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            startTransition(async () => {
                              await toggleActifProduitAction(p.id, !p.actif);
                              rafraichirDonnees();
                            });
                          }}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${
                            p.actif
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                          }`}
                        >
                          {p.actif ? "Actif" : "Inactif"}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setProdEnEdition({
                                id: p.id,
                                nom: p.nom,
                                categorieId: p.categorieId,
                                unite: p.unite,
                                actif: p.actif,
                              });
                              setModalProdOuvert(true);
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                            title="Modifier"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() =>
                              setModalSuppr({
                                type: "produit",
                                id: p.id,
                                nom: p.nom,
                                nbMouvements: p.nbMouvements,
                              })
                            }
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                            title="Supprimer"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          VUE 3 : GESTION DES CATÉGORIES (RF-01)
      ══════════════════════════════════════════════════════ */}
      {onglet === "categories" && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider bg-gray-50/70">
                  <th className="py-3 px-4">Nom de la Catégorie</th>
                  <th className="py-3 px-4">Chemin hiérarchique</th>
                  <th className="py-3 px-4 text-center">Statut</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categoriesFiltrees.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-400 text-sm">
                      Aucune catégorie trouvée.
                    </td>
                  </tr>
                ) : (
                  categoriesFiltrees.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-gray-900">
                        {c.nom}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500">
                        {c.chemin}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            c.parentId ? "bg-indigo-50 text-indigo-700" : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {c.parentId ? "Sous-catégorie" : "Racine"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setCatEnEdition({
                                id: c.id,
                                nom: c.nom,
                                parentId: c.parentId,
                                actif: true,
                              });
                              setModalCatOuvert(true);
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                            title="Modifier"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() =>
                              setModalSuppr({
                                type: "categorie",
                                id: c.id,
                                nom: c.nom,
                              })
                            }
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                            title="Supprimer"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODAL 1 : CRÉATION / ÉDITION CATÉGORIE
      ══════════════════════════════════════════════════════ */}
      {modalCatOuvert && catEnEdition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-lg text-gray-900">
                {catEnEdition.id ? "Modifier la catégorie" : "Nouvelle catégorie"}
              </h3>
              <button
                onClick={() => setModalCatOuvert(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={soumettreCategorie} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Nom de la catégorie <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={catEnEdition.nom}
                  onChange={(e) =>
                    setCatEnEdition((prev) => prev && { ...prev, nom: e.target.value })
                  }
                  placeholder="Ex: zezika, soleve, engrais..."
                  className="rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Catégorie Parente
                </label>
                <select
                  value={catEnEdition.parentId ?? ""}
                  onChange={(e) =>
                    setCatEnEdition((prev) =>
                      prev ? { ...prev, parentId: e.target.value || null } : null
                    )
                  }
                  className="rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="">(Aucune - Catégorie principale / racine)</option>
                  {data.toutesCategories
                    .filter((c) => c.id !== catEnEdition.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.chemin}
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-gray-400">
                  Sélectionnez une parente pour en faire une sous-catégorie.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalCatOuvert(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-100 transition-all disabled:opacity-50"
                >
                  {isPending ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODAL 2 : CRÉATION / ÉDITION PRODUIT
      ══════════════════════════════════════════════════════ */}
      {modalProdOuvert && prodEnEdition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-lg text-gray-900">
                {prodEnEdition.id ? "Modifier le produit" : "Nouveau produit"}
              </h3>
              <button
                onClick={() => setModalProdOuvert(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={soumettreProduit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Nom du produit <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={prodEnEdition.nom}
                  onChange={(e) =>
                    setProdEnEdition((prev) => prev && { ...prev, nom: e.target.value })
                  }
                  placeholder="Ex: vano mena, vano kely..."
                  className="rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Catégorie de rattachement <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={prodEnEdition.categorieId}
                  onChange={(e) =>
                    setProdEnEdition((prev) =>
                      prev ? { ...prev, categorieId: e.target.value } : null
                    )
                  }
                  className="rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="" disabled>
                    Sélectionner une sous-catégorie...
                  </option>
                  {data.toutesCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.chemin}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Unité de mesure <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={prodEnEdition.unite}
                  onChange={(e) =>
                    setProdEnEdition((prev) => prev && { ...prev, unite: e.target.value })
                  }
                  placeholder="Ex: pièce, kg, sac, carton..."
                  className="rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                />
                {/* Suggestions rapides d'unités */}
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {UNITES_AUTORISEES.slice(0, 6).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() =>
                        setProdEnEdition((prev) => prev && { ...prev, unite: u })
                      }
                      className={`px-2 py-0.5 rounded-lg text-xs font-medium border transition-colors ${
                        prodEnEdition.unite === u
                          ? "bg-emerald-50 border-emerald-300 text-emerald-800 font-bold"
                          : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalProdOuvert(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-100 transition-all disabled:opacity-50"
                >
                  {isPending ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODAL 3 : CONFIRMATION SUPPRESSION (GARDE-FOU RF-11)
      ══════════════════════════════════════════════════════ */}
      {modalSuppr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 flex flex-col gap-4">
            <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center font-bold text-lg">
              🗑
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900">
                Supprimer {modalSuppr.type === "categorie" ? "la catégorie" : "le produit"} ?
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Êtes-vous sûr de vouloir supprimer <strong>« {modalSuppr.nom} »</strong> ?
              </p>
              {modalSuppr.nbMouvements && modalSuppr.nbMouvements > 0 ? (
                <div className="mt-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                  ⚠️ <strong>Audit comptable :</strong> Ce produit possède {modalSuppr.nbMouvements} mouvement(s) dans l'historique. Sa suppression sera bloquée pour préserver les totaux, mais vous pouvez le désactiver.
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setModalSuppr(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={executerSuppression}
                disabled={isPending}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-100 transition-all disabled:opacity-50"
              >
                {isPending ? "Suppression..." : "Supprimer définitivement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
