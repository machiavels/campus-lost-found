/**
 * Prisma seed — Campus Lost & Found
 * Run with: npx prisma db seed
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const CATEGORIES = [
  { name: 'Électronique',    description: 'Téléphones, ordinateurs, tablettes, écouteurs, chargeurs…' },
  { name: 'Vêtements',       description: 'Manteaux, vestes, écharpes, gants, casquettes…' },
  { name: 'Livres',          description: 'Manuels, cahiers, agendas, carnets…' },
  { name: 'Clés',            description: 'Clés de chambre, de casier, trousseau…' },
  { name: 'Accessoires',     description: 'Lunettes, montres, bijoux, portefeuilles, sacs…' },
  { name: 'Documents',       description: "Cartes étudiantes, pièces d'identité, pass campus…" },
  { name: 'Sport & Loisirs', description: 'Équipement sportif, instruments de musique…' },
  { name: 'Autre',           description: 'Tout objet ne rentrant pas dans les catégories précédentes.' },
];

const LOCATIONS = [
  { name: 'Bibliothèque',        description: 'Bibliothèque universitaire — bâtiment central' },
  { name: 'Cafétéria',           description: 'Restaurant universitaire et espace de restauration' },
  { name: 'Amphithéâtre A',      description: 'Grand amphithéâtre — bâtiment A' },
  { name: 'Amphithéâtre B',      description: 'Amphithéâtre secondaire — bâtiment B' },
  { name: 'Salle informatique',  description: 'Salles TP et postes informatiques' },
  { name: 'Gymnase',             description: 'Complexe sportif et vestiaires' },
  { name: "Hall d'entrée",       description: 'Accueil principal — entrée du campus' },
  { name: 'Parking',             description: 'Parking étudiant et deux-roues' },
  { name: 'Résidence étudiante', description: 'Bâtiments de logements étudiants' },
  { name: 'Autre',               description: 'Lieu non listé — préciser dans la description' },
];

async function main() {
  // ── Catégories & Lieux ────────────────────────────────────────────────────
  console.log('🌱  Seeding categories & locations…');
  const cats = {};
  for (const cat of CATEGORIES) {
    const c = await prisma.category.upsert({ where: { name: cat.name }, update: {}, create: cat });
    cats[cat.name] = c;
  }
  const locs = {};
  for (const loc of LOCATIONS) {
    const l = await prisma.location.upsert({ where: { name: loc.name }, update: {}, create: loc });
    locs[loc.name] = l;
  }

  // ── Compte Admin ─────────────────────────────────────────────────────────
  console.log('🌱  Seeding admin account…');
  const adminHash = await bcrypt.hash('Admin1234!', 12);
  const admin = await prisma.user.upsert({
    where:  { email: 'admin@isep.fr' },
    update: {},
    create: {
      username: 'admin',
      email:    'admin@isep.fr',
      password: adminHash,
      role:     'ADMIN',
    },
  });

  // ── Comptes démo étudiants ────────────────────────────────────────────────
  console.log('🌱  Seeding demo users…');
  const pass = await bcrypt.hash('Demo1234!', 12);
  const alice = await prisma.user.upsert({
    where:  { email: 'alice@eleve.isep.fr' },
    update: {},
    create: { username: 'alice', email: 'alice@eleve.isep.fr', password: pass, role: 'STUDENT' },
  });
  const bob = await prisma.user.upsert({
    where:  { email: 'bob@eleve.isep.fr' },
    update: {},
    create: { username: 'bob', email: 'bob@eleve.isep.fr', password: pass, role: 'STUDENT' },
  });
  const charlie = await prisma.user.upsert({
    where:  { email: 'charlie@eleve.isep.fr' },
    update: {},
    create: { username: 'charlie', email: 'charlie@eleve.isep.fr', password: pass, role: 'STUDENT' },
  });

  // ── Annonces démo ────────────────────────────────────────────────────────
  console.log('🌱  Seeding demo items…');
  const items = [
    {
      title: 'AirPods Pro perdus',
      description: 'AirPods Pro blancs avec boîtier, perdus vendredi après-midi. Prénom gravé "Alice" sur le boîtier.',
      type: 'LOST', status: 'ACTIVE',
      userId: alice.id, categoryId: cats['Électronique'].id, locationId: locs['Bibliothèque'].id,
    },
    {
      title: 'Trousseau de clés trouvé',
      description: 'Trousseau avec 3 clés et un porte-clés rouge, trouvé près des casiers du couloir B.',
      type: 'FOUND', status: 'ACTIVE',
      userId: bob.id, categoryId: cats['Clés'].id, locationId: locs["Hall d'entrée"].id,
    },
    {
      title: 'Veste North Face noire perdue',
      description: 'Taille M, perdue après le cours de maths du mardi matin.',
      type: 'LOST', status: 'ACTIVE',
      userId: charlie.id, categoryId: cats['Vêtements'].id, locationId: locs['Amphithéâtre A'].id,
    },
    {
      title: 'Carte étudiante trouvée',
      description: 'Carte au nom de "Dupont Thomas" trouvée à la cafétéria.',
      type: 'FOUND', status: 'ACTIVE',
      userId: alice.id, categoryId: cats['Documents'].id, locationId: locs['Cafétéria'].id,
    },
    {
      title: 'MacBook Air 13" perdu',
      description: 'MacBook Air argent avec sticker ISEP, perdu en salle informatique. Contient des travaux importants.',
      type: 'LOST', status: 'ACTIVE',
      userId: bob.id, categoryId: cats['Électronique'].id, locationId: locs['Salle informatique'].id,
    },
    {
      title: 'Lunettes de vue trouvées',
      description: 'Monture noire rectangulaire, trouvées sur une table de la bibliothèque.',
      type: 'FOUND', status: 'ACTIVE',
      userId: charlie.id, categoryId: cats['Accessoires'].id, locationId: locs['Bibliothèque'].id,
    },
    {
      title: 'Manuel Algorithmique L3',
      description: 'Livre "Introduction aux algorithmes" édition 3, avec annotations en rouge.',
      type: 'LOST', status: 'ACTIVE',
      userId: alice.id, categoryId: cats['Livres'].id, locationId: locs['Amphithéâtre B'].id,
    },
    {
      title: 'Casque Sony WH-1000XM5 trouvé',
      description: 'Casque noir dans son étui, laissé au gymnase après la session sport de jeudi.',
      type: 'FOUND', status: 'CLAIMED',
      userId: bob.id, categoryId: cats['Électronique'].id, locationId: locs['Gymnase'].id,
    },
  ];

  const createdItems = [];
  for (const item of items) {
    const created = await prisma.item.create({ data: item });
    createdItems.push(created);
  }

  // ── Conversation démo ─────────────────────────────────────────────────────
  console.log('🌱  Seeding demo conversation…');
  const thread = await prisma.messageThread.create({
    data: {
      itemId: createdItems[0].id,
      participants: { connect: [{ id: alice.id }, { id: bob.id }] },
      messages: {
        create: [
          { senderId: bob.id,   content: 'Bonjour ! Tu as perdu des AirPods ? Je crois les avoir trouvés à la biblio.' },
          { senderId: alice.id, content: 'Oui c\'est moi !! Il y a le prénom Alice gravé dessus ?' },
          { senderId: bob.id,   content: 'Exactement ! Je suis disponible demain matin pour te les rendre à l\'accueil.' },
          { senderId: alice.id, content: 'Super merci beaucoup ! Je serai là vers 9h.' },
          { senderId: bob.id,   content: 'Parfait, à demain 👍' },
        ],
      },
    },
  });

  // Deuxième conversation
  await prisma.messageThread.create({
    data: {
      itemId: createdItems[2].id,
      participants: { connect: [{ id: charlie.id }, { id: alice.id }] },
      messages: {
        create: [
          { senderId: alice.id,   content: 'Salut, tu cherches une veste North Face noire ?' },
          { senderId: charlie.id, content: 'Oui ! Tu l\'as trouvée ?' },
          { senderId: alice.id,   content: 'Je crois avoir vu quelqu\'un la déposer en secretariat.' },
          { senderId: charlie.id, content: 'Je vais vérifier, merci du tuyau !' },
        ],
      },
    },
  });

  // ── Réclamation démo ──────────────────────────────────────────────────────
  console.log('🌱  Seeding demo claim…');
  await prisma.claim.create({
    data: {
      itemId:      createdItems[1].id,
      claimantId:  charlie.id,
      description: 'Ce sont mes clés ! Il y a un porte-clés rouge avec la lettre C.',
      status:      'PENDING',
    },
  });

  // ── Notifications démo ────────────────────────────────────────────────────
  console.log('🌱  Seeding demo notifications…');
  await prisma.notification.createMany({
    data: [
      { userId: alice.id,   type: 'NEW_MESSAGE',  message: 'Bob vous a envoyé un message concernant votre annonce.' },
      { userId: charlie.id, type: 'CLAIM_UPDATE',  message: 'Votre réclamation pour le trousseau de clés est en attente de validation.' },
      { userId: bob.id,     type: 'ITEM_CLAIMED',  message: 'Quelqu\'un a réclamé votre annonce "Trousseau de clés trouvé".' },
      { userId: alice.id,   type: 'NEW_MESSAGE',  message: 'Charlie vous a envoyé un message concernant la veste North Face.' },
    ],
    skipDuplicates: true,
  });

  console.log('\n✅  Seed complet !');
  console.log('─────────────────────────────────────');
  console.log('👤  Admin     : admin@isep.fr       / Admin1234!');
  console.log('👤  Alice     : alice@eleve.isep.fr / Demo1234!');
  console.log('👤  Bob       : bob@eleve.isep.fr   / Demo1234!');
  console.log('👤  Charlie   : charlie@eleve.isep.fr / Demo1234!');
  console.log('─────────────────────────────────────');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
