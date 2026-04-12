/**
 * Prisma seed — Campus Lost & Found
 * Run with: npx prisma db seed
 * (configure in package.json: "prisma": { "seed": "node prisma/seed.js" })
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CATEGORIES = [
  { name: 'Électronique',   description: 'Téléphones, ordinateurs, tablettes, écouteurs, chargeurs…' },
  { name: 'Vêtements',      description: 'Manteaux, vestes, écharpes, gants, casquettes…' },
  { name: 'Livres',         description: 'Manuels, cahiers, agendas, carnets…' },
  { name: 'Clés',           description: 'Clés de chambre, de casier, trousseau…' },
  { name: 'Accessoires',    description: 'Lunettes, montres, bijoux, portefeuilles, sacs…' },
  { name: 'Documents',      description: 'Cartes étudiantes, pièces d\'identité, pass campus…' },
  { name: 'Sport & Loisirs',description: 'Équipement sportif, instruments de musique…' },
  { name: 'Autre',          description: 'Tout objet ne rentrant pas dans les catégories précédentes.' },
];

const LOCATIONS = [
  { name: 'Bibliothèque',         description: 'Bibliothèque universitaire — bâtiment central' },
  { name: 'Cafétéria',            description: 'Restaurant universitaire et espace de restauration' },
  { name: 'Amphithéâtre A',       description: 'Grand amphithéâtre — bâtiment A' },
  { name: 'Amphithéâtre B',       description: 'Amphithéâtre secondaire — bâtiment B' },
  { name: 'Salle informatique',   description: 'Salles TP et postes informatiques' },
  { name: 'Gymnase',              description: 'Complexe sportif et vestiaires' },
  { name: 'Hall d\'entrée',       description: 'Accueil principal — entrée du campus' },
  { name: 'Parking',              description: 'Parking étudiant et deux-roues' },
  { name: 'Résidence étudiante',  description: 'Bâtiments de logements étudiants' },
  { name: 'Autre',                description: 'Lieu non listé — préciser dans la description' },
];

async function main() {
  console.log('🌱  Seeding categories…');
  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where:  { name: cat.name },
      update: {},
      create: cat,
    });
  }

  console.log('🌱  Seeding locations…');
  for (const loc of LOCATIONS) {
    await prisma.location.upsert({
      where:  { name: loc.name },
      update: {},
      create: loc,
    });
  }

  console.log('✅  Seed complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
