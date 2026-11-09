// ─────────────────────────────────────────────────────────────
// Seed Prisma – Initialisation des utilisateurs et du catalogue
// ─────────────────────────────────────────────────────────────

import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Début de l'initialisation des données (Seed)...");

  // 1. Initialisation des utilisateurs par défaut
  const passwordHash = bcrypt.hashSync("admin", 10);

  const users = [
    {
      nom: "Rina",
      identifiant: "Rina",
      motDePasseHache: passwordHash,
      role: Role.ADMIN,
      actif: true,
    },
    {
      nom: "Francia",
      identifiant: "Francia",
      motDePasseHache: passwordHash,
      role: Role.ADMIN,
      actif: true,
    },
  ];

  for (const u of users) {
    const existing = await prisma.utilisateur.findFirst({
      where: { identifiant: { equals: u.identifiant, mode: "insensitive" } },
    });

    if (!existing) {
      const created = await prisma.utilisateur.create({ data: u });
      console.log(`✅ Utilisateur créé : ${created.nom} (${created.identifiant}) - Rôle: ${created.role}`);
    } else {
      console.log(`ℹ️ Utilisateur existant : ${existing.nom} (${existing.identifiant})`);
    }
  }

  // 2. Exemple de catalogue de démarrage (si aucun catalogue n'existe)
  const catCount = await prisma.categorie.count();
  if (catCount === 0) {
    console.log("📦 Création des catégories d'exemple...");
    const catZezika = await prisma.categorie.create({
      data: {
        nom: "zezika",
        actif: true,
      },
    });

    const subSoleve = await prisma.categorie.create({
      data: {
        nom: "soleve",
        parentId: catZezika.id,
        actif: true,
      },
    });

    await prisma.produit.createMany({
      data: [
        {
          nom: "vano mena",
          categorieId: subSoleve.id,
          unite: "sac",
          actif: true,
        },
        {
          nom: "vano kely",
          categorieId: subSoleve.id,
          unite: "sac",
          actif: true,
        },
      ],
    });
    console.log("✅ Catégories et produits d'exemple créés (zezika > soleve > vano mena / vano kely)");
  }

  console.log("✨ Seed terminé avec succès !");
}

main()
  .catch((e) => {
    console.error("❌ Erreur pendant le seed :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
