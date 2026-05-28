# Campus Lost & Found — Mobile App (Expo)

Application React Native pour le projet Campus Lost & Found.

## Prérequis

- Node.js 18+
- [Expo Go](https://expo.dev/go) installé sur votre téléphone
- Le backend `server/` en cours d'exécution

## Installation

```bash
cd mobile
npm install
```

## Configuration

Copiez `.env.example` en `.env` et renseignez l'URL de votre backend :

```bash
cp .env.example .env
# Éditez .env et mettez votre IP locale, ex : http://192.168.1.42:3000
```

> ⚠️ Sur téléphone physique, utilisez votre **IP locale** (pas `localhost`).
> Lancez `ipconfig` (Windows) ou `ifconfig` (Mac/Linux) pour la trouver.

## Lancement

```bash
npm start
# ou
npx expo start
```

Scannez le QR code avec **Expo Go** sur votre téléphone.

## Structure

```
mobile/
├── App.js                  # Point d'entrée, navigation
├── app.json                # Config Expo
├── src/
│   ├── api/
│   │   └── client.js       # Appels HTTP vers le backend
│   ├── context/
│   │   └── AuthContext.js  # Token JWT, user global
│   ├── screens/
│   │   ├── AuthScreen.js   # Login / Register
│   │   ├── HomeScreen.js   # Feed objets + stats
│   │   ├── SearchScreen.js # Recherche + filtres
│   │   ├── DetailScreen.js # Détail objet + claim/restitution
│   │   ├── DeclareScreen.js# Formulaire déclaration
│   │   ├── MessagesScreen.js
│   │   └── ProfileScreen.js
│   └── theme/
│       └── index.js        # Couleurs, espacements
└── assets/                 # Icônes et splash (à remplacer)
```

## Routes backend utilisées

| Route | Écran |
|---|---|
| `POST /api/auth/login` | Auth |
| `POST /api/auth/register` | Auth |
| `GET /api/items` | Home, Search |
| `GET /api/items/:id` | Detail |
| `POST /api/items` | Declare |
| `POST /api/claims` | Detail (claim) |
| `PATCH /api/items/:id` | Detail (résoudre) |
| `GET /api/search/items` | Search |
| `GET /api/users/me` | Profile |
| `GET /api/notifications` | Badge notif |
| `GET /api/messages/conversations` | Messages |
