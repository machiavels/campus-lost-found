# Portail de Gestion des Objets Perdus et Trouvés — Campus

Ce projet constitue une application web complète (*full-stack*) destinée à la gestion centralisée des objets perdus et trouvés au sein d'un campus universitaire. Il permet aux membres de la communauté académique de déclarer des objets égarés ou découverts, d'effectuer des recherches ciblées et d'engager une procédure de réclamation, le tout au travers d'une interface sécurisée et conforme aux exigences réglementaires en vigueur (RGPD, WCAG).

---

## Stack Technique

| Couche | Technologie |
|---|---|
| Serveur (*backend*) | Node.js + Express |
| Base de données | PostgreSQL (ORM Prisma) |
| Authentification | JWT (access 15 min + refresh token 7 jours) |
| Interface (*frontend*) | HTML / CSS / JavaScript (natif, sans framework) |
| Stockage des fichiers | Système de fichiers local / compatible S3 |
| Documentation API | Swagger UI / OpenAPI 3.0 (`swagger-jsdoc`) |
| Sécurité HTTP | Helmet.js (CSP, HSTS, X-Frame-Options) |
| Rate limiting | `express-rate-limit` |

---

## Structure du Projet

```
campus-lost-found/
├── server/
│   ├── src/
│   │   ├── config/         # Configuration base de données, variables d'environnement, Multer
│   │   ├── middleware/     # Auth, erreurs (RFC 7807), upload, rate limiting
│   │   ├── models/         # Schéma Prisma (voir prisma/)
│   │   ├── routes/         # Routeurs Express
│   │   ├── controllers/    # Logique métier par ressource
│   │   ├── services/       # Couche de services réutilisables
│   │   └── app.js          # Point d'entrée de l'application Express
│   ├── prisma/
│   │   └── schema.prisma   # Schéma ER complet (7 entités)
│   ├── tests/              # Tests d'intégration Jest
│   └── package.json
├── client/
│   ├── public/
│   │   ├── index.html
│   │   ├── css/
│   │   └── js/
│   └── pages/
└── docs/
    ├── cahier-des-charges.md
    ├── features.md
    └── openapi.json        # Spécification OpenAPI 3.0 exportée
```

---

## Mise en Route

```bash
# 1. Installation des dépendances
cd server && npm install

# 2. Copie du fichier de configuration
cp .env.example .env
# Renseigner DATABASE_URL, JWT_SECRET, REFRESH_TOKEN_SECRET
# et ALLOWED_EMAIL_DOMAINS (ex: eleve.isep.fr,isep.fr)

# 3. Exécution des migrations de base de données
npx prisma migrate dev --name init

# 4. Démarrage du serveur en mode développement
npm run dev
```

### Variables d'environnement

| Variable | Exemple | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://...` | URL de connexion PostgreSQL |
| `JWT_SECRET` | `<secret>` | Clé de signature des access tokens |
| `REFRESH_TOKEN_SECRET` | `<secret>` | Clé de signature des refresh tokens |
| `ALLOWED_EMAIL_DOMAINS` | `eleve.isep.fr,isep.fr` | Domaines institutionnels autorisés à l'inscription |
| `NODE_ENV` | `development` | Désactive Swagger UI en `production` |

---

## Modèle de Données (Entités ER)

Le schéma relationnel repose sur **7 entités principales** : `User`, `Item`, `Location`, `Category`, `Message`, `ClaimRequest`, `Photo`.

Le détail complet du schéma est disponible dans `server/prisma/schema.prisma`.

---

## Fonctionnalités

**Implémentées**

- Authentification institutionnelle (JWT access token 15 min + refresh token 7 jours, cookie `HttpOnly`)
- Validation du domaine email institutionnel à l'inscription (`ALLOWED_EMAIL_DOMAINS`)
- Déclaration d'objets perdus et trouvés (opérations CRUD complètes)
- Téléversement de photographies avec vérification des magic bytes MIME réels (rejet des fichiers déguisés)
- Recherche et filtrage avancés (mots-clés, catégorie, lieu, date, statut)
- Pagination standardisée sur toutes les routes de liste (`page`, `limit`, réponse `meta`)
- Messagerie interne sécurisée entre utilisateurs
- Notifications in-app + **notifications en temps réel via Server-Sent Events** (`GET /api/notifications/stream`)
- Gestion du profil utilisateur (`GET/PUT /api/users/me`, changement de mot de passe, suppression RGPD)
- Interface de modération administrative
- Processus de demande de réclamation
- Headers de sécurité HTTP (Helmet.js : CSP strict, HSTS 1 an + preload, X-Frame-Options DENY)
- Rate limiting : 200 req/15 min global, 20 req/15 min sur les routes d'authentification
- Format d'erreur normalisé **RFC 7807** (`application/problem+json`)
- Endpoint de health check (`GET /api/health`)
- Documentation interactive Swagger UI (`GET /api/docs`, désactivée en production)

**Prévues (versions ultérieures)**

- Suggestion automatique de correspondances (intelligence artificielle / apprentissage automatique)

---

## Tests

```bash
cd server && npm test
```

Les tests d'intégration Jest couvrent :

| Fichier | Périmètre |
|---|---|
| `tests/auth.test.js` | Register, login, refresh, logout, validation domaine |
| `tests/items.test.js` | CRUD annonces, upload photos, filtres, pagination |
| `tests/messages.test.js` | Envoi, conversations, fil de discussion, guards |
| `tests/claims.test.js` | Soumission, approbation/rejet, notifications |
| `tests/admin.test.js` | Modération, gestion users, catégories, lieux |
| `tests/security.test.js` | Headers Helmet, rate limiting, MIME validation |
| `tests/rfc7807.test.js` | Format d'erreur normalisé RFC 7807 |

---

## API Reference

Base URL : `http://localhost:3000/api`

> 💡 **Documentation interactive :** `GET /api/docs` (Swagger UI, disponible uniquement en `NODE_ENV=development`)

Toutes les routes protégées nécessitent un header :
```
Authorization: Bearer <access_token>
```

---

### Health Check

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| `GET` | `/health` | ❌ | Retourne `{ status: 'ok', timestamp }` |

---

### Authentication (`/api/auth`)

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| `POST` | `/auth/register` | ❌ | Inscription — domaine institutionnel requis |
| `POST` | `/auth/login` | ❌ | Connexion — retourne access token + refresh token (cookie) |
| `POST` | `/auth/refresh` | ❌ | Renouvelle l'access token via le refresh token (cookie) |
| `POST` | `/auth/logout` | ✅ | Invalide le refresh token |
| `GET` | `/auth/me` | ✅ | Retourne le profil de l'utilisateur connecté |

**POST `/auth/register`**
```json
// Corps de la requête
{
  "email": "prenom.nom@eleve.isep.fr",
  "password": "motdepasse123",
  "username": "prenom.nom"
}

// Réponse 201
{
  "user": { "id": 1, "email": "prenom.nom@eleve.isep.fr", "username": "prenom.nom" },
  "token": "<access_token>"
}
```

**POST `/auth/login`**
```json
// Corps de la requête
{ "email": "prenom.nom@eleve.isep.fr", "password": "motdepasse123" }

// Réponse 200 (le refresh token est envoyé en cookie HttpOnly)
{ "token": "<access_token>", "user": { "id": 1, "email": "...", "role": "USER" } }
```

**POST `/auth/refresh`**
```json
// Le refresh token est lu depuis le cookie HttpOnly

// Réponse 200
{ "token": "<nouveau_access_token>" }
```

---

### Profil Utilisateur (`/api/users`)

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| `GET` | `/users/me` | ✅ | Profil complet de l'utilisateur connecté |
| `PUT` | `/users/me` | ✅ | Mettre à jour `username`, `avatar`, `bio` |
| `PATCH` | `/users/me/password` | ✅ | Changer le mot de passe (ancien mdp requis) |
| `DELETE` | `/users/me` | ✅ | Anonymiser / supprimer le compte (RGPD) |
| `GET` | `/users/:id` | ❌ | Profil public d'un utilisateur (sans données sensibles) |

---

### Items (`/api/items`)

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| `GET` | `/items` | Optionnel | Liste les annonces (filtrages + pagination) |
| `GET` | `/items/:id` | Optionnel | Détail d'une annonce |
| `POST` | `/items` | ✅ | Créer une annonce |
| `PUT` | `/items/:id` | ✅ | Modifier une annonce (propriétaire) |
| `DELETE` | `/items/:id` | ✅ | Supprimer une annonce (propriétaire ou admin) |
| `PATCH` | `/items/:id/close` | ✅ | Marquer l'annonce comme résolue/réclamée |
| `POST` | `/items/:id/photos` | ✅ | Uploader des photos (MIME vérifié) |
| `DELETE` | `/photos/:id` | ✅ | Supprimer une photo |

**GET `/items` — Query params disponibles**

| Paramètre | Type | Description |
|-----------|------|-------------|
| `type` | `string` | `LOST` ou `FOUND` |
| `categoryId` | `number` | Filtrer par catégorie |
| `locationId` | `number` | Filtrer par lieu |
| `status` | `string` | `ACTIVE`, `RESOLVED`, `PENDING` |
| `q` | `string` | Recherche par mot-clé |
| `page` | `number` | Page (défaut: 1) |
| `limit` | `number` | Résultats par page (défaut: 20, max: 100) |

**Réponse paginée standard**
```json
{
  "data": [ { "id": 42, "title": "Portefeuille noir", ... } ],
  "meta": { "total": 154, "page": 1, "limit": 20, "totalPages": 8 }
}
```

---

### Recherche (`/api/search`)

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| `GET` | `/search` | Optionnel | Recherche avancée multi-critères |

**GET `/search` — Query params**

| Paramètre | Type | Description |
|-----------|------|-------------|
| `q` | `string` | Terme de recherche (titre, description) |
| `type` | `string` | `LOST` ou `FOUND` |
| `categoryId` | `number` | ID de catégorie |
| `locationId` | `number` | ID de lieu |
| `startDate` | `string` | Date de début (ISO 8601) |
| `endDate` | `string` | Date de fin (ISO 8601) |
| `page` | `number` | Page (défaut: 1) |
| `limit` | `number` | Résultats par page (défaut: 20) |

---

### Messages (`/api/messages`)

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| `GET` | `/messages` | ✅ | Inbox — messages reçus |
| `GET` | `/messages/conversations` | ✅ | Liste des conversations groupées |
| `GET` | `/messages/thread/:itemId/:partnerId` | ✅ | Fil de discussion par item et interlocuteur |
| `GET` | `/messages/item/:itemId` | ✅ | Tous les messages liés à un item |
| `POST` | `/messages` | ✅ | Envoyer un message |
| `PATCH` | `/messages/:id/read` | ✅ | Marquer un message comme lu |

**POST `/messages`**
```json
// Corps de la requête
{
  "receiverId": 5,
  "itemId": 42,
  "content": "Bonjour, est-ce votre portefeuille ?"
}

// Réponse 201
{ "message": { "id": 99, "content": "...", "createdAt": "2026-04-17T..." } }
```

---

### Notifications (`/api/notifications`)

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| `GET` | `/notifications` | ✅ | Liste des notifications de l'utilisateur |
| `GET` | `/notifications/stream` | ✅ | Flux SSE en temps réel (`text/event-stream`) |
| `PATCH` | `/notifications/read-all` | ✅ | Marquer toutes les notifications comme lues |
| `PATCH` | `/notifications/:id/read` | ✅ | Marquer une notification comme lue |

**Utilisation SSE côté client**
```javascript
const source = new EventSource('/api/notifications/stream', {
  headers: { Authorization: `Bearer ${token}` }
});
source.onmessage = (event) => {
  const notification = JSON.parse(event.data);
  // Afficher la notification dans l'UI
};
```

**GET `/notifications` — Exemple de réponse**
```json
{
  "notifications": [
    {
      "id": 1,
      "type": "NEW_MESSAGE",
      "message": "Vous avez reçu un nouveau message",
      "read": false,
      "createdAt": "2026-04-17T14:00:00Z"
    }
  ],
  "unreadCount": 1
}
```

---

### Réclamations (`/api/claims`)

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| `POST` | `/claims` | ✅ | Soumettre une réclamation sur un item |
| `GET` | `/claims` | ✅ | Admin : toutes les réclamations / User : les siennes |
| `GET` | `/claims/my` | ✅ | Réclamations de l'utilisateur connecté |
| `PATCH` | `/claims/:id/review` | 🔒 ADMIN | Approuver ou rejeter une réclamation |

**POST `/claims`**
```json
// Corps de la requête
{
  "itemId": 42,
  "description": "C'est mon portefeuille, il contient ma carte étudiante n°12345"
}

// Réponse 201
{ "claim": { "id": 7, "status": "PENDING", "itemId": 42, ... } }
```

---

### Administration (`/api/admin`)

> Toutes les routes admin nécessitent le rôle `ADMIN`.

#### Modération des annonces

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/admin/items` | Liste les items en attente de modération |
| `PATCH` | `/admin/items/:id/moderate` | Approuver ou rejeter une annonce |

**PATCH `/admin/items/:id/moderate`**
```json
// Corps de la requête
{ "action": "APPROVE" }  // ou "REJECT"
```

#### Gestion des utilisateurs

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/admin/users` | Liste tous les utilisateurs |
| `GET` | `/admin/users/:id` | Détail d'un utilisateur |
| `PUT` | `/admin/users/:id` | Modifier un utilisateur |
| `PATCH` | `/admin/users/:id/status` | Activer / suspendre un compte |
| `PATCH` | `/admin/users/:id/role` | Changer le rôle (`USER` / `ADMIN`) |

#### Catégories

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/admin/categories` | Liste toutes les catégories |
| `POST` | `/admin/categories` | Créer une catégorie |
| `PUT` | `/admin/categories/:id` | Modifier une catégorie |
| `DELETE` | `/admin/categories/:id` | Supprimer une catégorie |

#### Lieux

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/admin/locations` | Liste tous les lieux |
| `POST` | `/admin/locations` | Créer un lieu |
| `PUT` | `/admin/locations/:id` | Modifier un lieu |
| `DELETE` | `/admin/locations/:id` | Supprimer un lieu |

---

### Codes de Réponse

Les erreurs suivent le format **RFC 7807** (`Content-Type: application/problem+json`) :

```json
{
  "type": "https://campus-lost-found/errors/not-found",
  "title": "Not Found",
  "status": 404,
  "detail": "Item with id 99 not found",
  "instance": "/api/items/99"
}
```

| Code | Signification |
|------|---------------|
| `200` | Succès |
| `201` | Ressource créée |
| `400` | Requête invalide (paramètres manquants ou incorrects) |
| `401` | Non authentifié (token manquant ou expiré) |
| `403` | Non autorisé (droits insuffisants) |
| `404` | Ressource introuvable |
| `409` | Conflit (ex : email déjà utilisé) |
| `429` | Trop de requêtes (rate limiting) |
| `500` | Erreur serveur interne |

---

> Développé pour le campus de l'ISEP. Conforme au RGPD et aux standards d'accessibilité WCAG.
