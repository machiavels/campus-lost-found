# Portail de Gestion des Objets Perdus et Trouvés — Campus

Ce projet constitue une application web complète (*full-stack*) destinée à la gestion centralisée des objets perdus et trouvés au sein d'un campus universitaire. Il permet aux membres de la communauté académique de déclarer des objets égarés ou découverts, d'effectuer des recherches ciblées et d'engager une procédure de réclamation, le tout au travers d'une interface sécurisée et conforme aux exigences réglementaires en vigueur (RGPD, WCAG).

---

## Stack Technique

| Couche | Technologie |
|---|---|
| Serveur (*backend*) | Node.js + Express |
| Base de données | PostgreSQL (ORM Prisma) |
| Authentification | JWT + messagerie institutionnelle |
| Interface (*frontend*) | HTML / CSS / JavaScript (natif, sans framework) |
| Stockage des fichiers | Système de fichiers local / compatible S3 |

---

## Structure du Projet

```
campus-lost-found/
├── server/
│   ├── src/
│   │   ├── config/         # Configuration base de données, variables d'environnement, Multer
│   │   ├── middleware/     # Authentification, gestion des erreurs, téléversement
│   │   ├── models/         # Schéma Prisma (voir prisma/)
│   │   ├── routes/         # Routeurs Express
│   │   ├── controllers/    # Logique métier par ressource
│   │   ├── services/       # Couche de services réutilisables
│   │   └── app.js          # Point d'entrée de l'application Express
│   ├── prisma/
│   │   └── schema.prisma   # Schéma ER complet (7 entités)
│   └── package.json
├── client/
│   ├── public/
│   │   ├── index.html
│   │   ├── css/
│   │   └── js/
│   └── pages/
└── docs/
    ├── cahier-des-charges.md
    └── features.md
```

---

## Mise en Route

```bash
# 1. Installation des dépendances
cd server && npm install

# 2. Copie du fichier de configuration
cp .env.example .env
# Renseigner DATABASE_URL et JWT_SECRET

# 3. Exécution des migrations de base de données
npx prisma migrate dev --name init

# 4. Démarrage du serveur en mode développement
npm run dev
```

---

## Modèle de Données (Entités ER)

Le schéma relationnel repose sur **7 entités principales** : `User`, `Item`, `Location`, `Category`, `Message`, `ClaimRequest`, `Photo`.

Le détail complet du schéma est disponible dans `server/prisma/schema.prisma`.

---

## Fonctionnalités (Périmètre MVP)

**Implémentées**

- Authentification institutionnelle (JWT, messagerie campus)
- Déclaration d'objets perdus et trouvés (opérations CRUD complètes)
- Téléversement de photographies par annonce
- Recherche et filtrage avancés (mots-clés, catégorie, lieu, date, statut)
- Messagerie interne sécurisée entre utilisateurs
- Interface de modération administrative
- Processus de demande de réclamation

**Prévues (versions ultérieures)**

- Suggestion automatique de correspondances (intelligence artificielle / apprentissage automatique)
- Système de notifications en temps réel

---

> Développé pour le campus de l'ISEP. Conforme au RGPD et aux standards d'accessibilité WCAG.
