# Simple Toys Maroc — Site avec commandes réelles

Ce site permet aux clients de **vraiment commander**, avec :

- **Paiement en espèces à la livraison uniquement** (pas de carte bancaire, pas de PayPal —
  volontairement retiré pour simplifier et rassurer les clients).
- **Prix fixe**, quelle que soit la quantité commandée.
- Un **email automatique** part vers `simpeltoysmaroc@gmail.com` à chaque commande, et un
  **email de confirmation** part vers le client, avec son numéro de commande.
- **Suivi de commande** : le client entre son numéro de commande + son email ou téléphone
  sur la page "Suivre ma commande", et voit en direct où en est sa commande
  (nouvelle → en préparation → expédiée → livrée).
- Vous (admin) changez le statut d'une commande en un clic depuis le panneau de gestion —
  un email est automatiquement envoyé au client à chaque changement de statut.
- Le site est **en français par défaut**, avec bascule vers la **darija marocaine** (écrite
  en caractères arabes). Le client choisit sa langue dès son arrivée sur le site (fenêtre de
  bienvenue), et peut la changer à tout moment via les boutons FR / الدارجة en haut de page.
- Design modernisé, orienté confiance : bandeau et badges rassurants ("paiement à la
  livraison", "aucune donnée bancaire requise", icônes Font Awesome, page de confirmation
  claire après commande).
- Panneau **Admin** sécurisé : mot de passe haché (bcrypt), jamais visible dans le code,
  session par jeton JWT.
- Les prix sont recalculés **côté serveur** — impossible pour un client de trafiquer le
  total depuis son navigateur.

Mot de passe admin actuel : **Calendrier3**.

---

## Ce qui n'est PAS inclus (choix de simplification assumés)

Vous m'aviez transmis un cahier des charges très complet (architecture séparée
frontend/backend + base de données PostgreSQL, galeries d'images produit, variantes
couleur, thème clair/sombre, conversion multi-devises, pages légales complètes, import
JSON en masse). J'ai gardé l'architecture plus simple déjà en place (un seul serveur
Node/Express avec des fichiers JSON comme base de données) plutôt que de migrer vers
PostgreSQL, parce que :

- Elle fait déjà tout ce qui compte pour votre activité (commandes réelles, emails
  automatiques, suivi de commande, admin sécurisé) ;
- Elle est bien plus simple à héberger et à maintenir seul, sans base de données à gérer ;
- Une migration complète vers Postgres + séparation frontend/backend est un chantier
  de plusieurs jours, disproportionné pour un catalogue de 26 produits.

Si votre activité grossit fortement (des centaines de commandes par jour, plusieurs
personnes qui gèrent le site en même temps), ce sera le bon moment pour migrer vers une
vraie base de données — dites-le-moi le moment venu.

---

## 1. Structure du projet

```
simpletoys-site/
├── server.js              → le serveur (commandes, statuts, emails, admin)
├── package.json
├── .env.example            → modèle de configuration (à copier en .env)
├── data/
│   ├── products.json       → catalogue (26 produits)
│   └── orders.json         → commandes reçues (créé automatiquement)
├── public/
│   └── index.html          → le site (frontend, tout-en-un)
├── public/images/          → À CRÉER : vos photos produits, nommées "923.jpg", "5.jpg", etc.
└── scripts/
    └── hash-password.js    → pour changer le mot de passe admin
```

---

## 2. Installer et lancer en local (pour tester avant publication)

```bash
cd simpletoys-site
npm install
cp .env.example .env
```

Puis ouvrez `.env` et remplissez au minimum :

```
JWT_SECRET=une_longue_chaine_aleatoire
ADMIN_PASSWORD_HASH=$2a$12$GOv9d0kM7lthmjUbh4VLEu9EvQK1SnWQImhu/Wfv6wCkGyrLCxSEa
EMAIL_USER=simpeltoysmaroc@gmail.com
EMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

Le `ADMIN_PASSWORD_HASH` ci-dessus correspond déjà au mot de passe **Calendrier3**.

Démarrez :
```bash
npm start
```
Le site est accessible sur http://localhost:3000

---

## 3. Configurer l'envoi automatique des emails (Gmail)

1. Allez sur https://myaccount.google.com/security, activez la validation en 2 étapes.
2. Allez sur https://myaccount.google.com/apppasswords, créez un mot de passe d'application.
3. Copiez le code à 16 caractères dans `.env` :
   ```
   EMAIL_APP_PASSWORD=abcdefghijklmnop
   ```

Une fois configuré :
- Chaque commande envoie un email à `simpeltoysmaroc@gmail.com` (détail complet).
- Le client reçoit une confirmation avec son numéro de commande.
- Chaque changement de statut (préparation, expédiée, livrée...) envoie un email de mise
  à jour automatique au client.

---

## 4. Suivi de commande — comment ça marche

Le client va sur la page "Suivre ma commande", entre :
- son **numéro de commande** (reçu par email, ex: `CMD20260725-MS0OOAFC` ou juste
  l'identifiant court affiché sur le site) ;
- **son email OU son téléphone** utilisé lors de la commande (vérification anti-fuite :
  personne ne peut consulter une commande qui n'est pas la sienne).

Il voit alors une frise avec l'état actuel : Nouvelle → En préparation → Expédiée → Livrée.

Vous, en tant qu'admin, changez le statut depuis le panneau de gestion (menu déroulant à
côté de chaque commande) — le client reçoit alors un email automatique.

---

## 5. Changer le mot de passe admin

```bash
npm run hash-password -- VotreNouveauMotDePasse
```
Copiez le hash affiché dans `.env` à la ligne `ADMIN_PASSWORD_HASH=`.

---

## 6. Mettre le site en ligne (publier)

Ce site a besoin d'un serveur qui reste allumé (Node.js). Options simples :

- **Railway** (railway.app) — le plus simple, gratuit pour démarrer.
- **Render** (render.com) — gratuit avec quelques limites.
- Un VPS si vous préférez tout gérer vous-même.

Étapes :
1. Mettez ce dossier sur GitHub (le `.gitignore` empêche déjà `.env` et `node_modules`
   d'être publiés).
2. Connectez le dépôt GitHub à Railway ou Render.
3. Ajoutez toutes les variables de `.env` dans les "Environment Variables" du service.
4. Mettez `SITE_URL` sur l'adresse finale du site, puis redéployez.
5. Si vous avez un nom de domaine, reliez-le dans les paramètres "Domains".

Le site doit être en **HTTPS** (fourni automatiquement par Railway/Render).

**Point d'attention si vous passez sur Railway/Render en plan gratuit** : certaines de ces
plateformes bloquent parfois les connexions SMTP sortantes classiques (dont Gmail) pour
anti-spam. Si les emails ne partent plus une fois en ligne alors qu'ils fonctionnaient en
local, c'est le signe le plus probable — dans ce cas, il faudra basculer l'envoi d'email
vers un service via API HTTPS comme Resend ou EmailJS plutôt que du SMTP direct. Faites-le
moi savoir si ça arrive, je peux adapter le code.

---

## 7. Ajouter vos photos produits

Créez `public/images/` et déposez vos photos, nommées exactement comme la référence
produit (`923.jpg`, `5.jpg`, etc.). Sans photo, "Image Manquante" s'affiche — rien ne casse.

---

## 8. Sécurité — ce qui a été fait

- Mot de passe admin haché (bcrypt), jamais stocké en clair.
- Session admin par jeton JWT signé, expire après 8h.
- Limitation du nombre de requêtes (anti-spam / anti-bruteforce) sur les commandes, le
  login admin et le suivi de commande.
- Validation stricte de tous les champs envoyés par les clients.
- Prix et total recalculés côté serveur (impossible à trafiquer depuis le navigateur).
- Suivi de commande protégé : il faut connaître le numéro de commande ET l'email/téléphone
  exact du client — impossible de consulter la commande de quelqu'un d'autre en devinant
  juste un numéro.
- Aucune carte bancaire n'est jamais demandée : rien à sécuriser de ce côté.
- En-têtes de sécurité HTTP (Helmet).

À faire de votre côté avant un vrai lancement :
- Gardez `.env` strictement privé — ne le partagez jamais, ne le mettez jamais sur GitHub.
