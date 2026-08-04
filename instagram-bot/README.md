# 🧸 Bot Instagram automatique — Simple Toys Maroc

Publie automatiquement **chaque jour** un produit de ton catalogue sur Instagram :
photo propre et epuree + prix, legende en **francais et darija**, **hashtags cibles Casablanca**,
sans jamais reposter le meme produit avant plusieurs semaines.

**Cout : 0 DH, pour toujours.** La publication passe par **Make.com** (connexion Instagram en
2 clics, aucune app developpeur Meta, aucune verification SMS a faire).

---

## Comment ca marche

1. Chaque jour a une heure fixe, **GitHub Actions** (gratuit) reveille le bot.
2. Le bot va chercher tes produits sur `simpel-toys-production.up.railway.app/api/products`.
3. Il choisit **un produit qui n'a pas ete poste recemment** (memoire dans `data/history.json`).
4. Il genere une image propre (photo produit + nom + prix + logo texte) et une legende
   FR + Darija + hashtags — **differente a chaque fois**.
5. Il pousse l'image sur GitHub, puis appelle ton **webhook Make.com**, qui publie sur Instagram
   (deja connecte, comme tu l'as deja fait et teste avec succes ✅).

---

## Ce qui est deja fait (bravo !)

- ✅ Compte Instagram connecte a Make.com
- ✅ Scenario Make cree : Webhook → Instagram for Business (Create a Photo Post)
- ✅ Champs mappes (`photo_url` → URL de la photo, `caption` → Legende)
- ✅ Test reussi

## Ce qu'il reste a faire

### 1. Activer le scenario en continu

Dans Make, en bas de l'ecran du scenario, il y a un bouton/interrupteur (a cote de
"Immediatement au moment ou les donnees arrivent" ou en haut a droite selon la vue) pour
**activer le scenario** (le passer de "brouillon" a "actif"). Une fois actif, il ecoute son
webhook en permanence, plus besoin de cliquer "Executer une fois" a chaque fois.

### 2. Recuperer l'URL du webhook

Elle est visible dans le module Webhooks (celle que tu as deja utilisee pour les tests), du type :
```
https://hook.eu1.make.com/zosz964tqkb0mm7kel1nyjr5i43p9sdz
```

### 3. Mettre le code sur GitHub

1. Dans ton repo `Elwab009/simpel-toys`, ajoute le dossier `instagram-bot/` fourni.
2. Va dans **Settings → Secrets and variables → Actions → New repository secret** et ajoute :

   | Nom du secret       | Valeur                                                        |
   |----------------------|----------------------------------------------------------------|
   | `SITE_URL`           | `https://simpel-toys-production.up.railway.app`               |
   | `MAKE_WEBHOOK_URL`   | l'URL de ton webhook Make (etape 2 ci-dessus)                  |
   | `GEMINI_API_KEY`     | (optionnel) une cle gratuite sur ai.google.dev pour des legendes encore plus naturelles |

   Aucune de ces valeurs n'est un paiement.

### 4. Activer le planning quotidien

Le fichier `.github/workflows/daily-post.yml` est deja configure pour se lancer **chaque jour a
9h UTC** (~10h-11h au Maroc selon la saison). Rien d'autre a faire, ca s'active tout seul des que
le code est pousse sur GitHub — gratuit jusqu'a 2000 minutes d'execution par mois (un post prend
~1 minute).

Pour changer l'heure : modifie la ligne `cron: '0 9 * * *'` (format `minute heure * * *`, en UTC).

Tu peux aussi le lancer manuellement pour tester : onglet **Actions** du repo GitHub → *Post
Instagram quotidien Simple Toys* → **Run workflow**.

---

## Tester en local avant le premier vrai post automatique

```bash
cd instagram-bot
npm install
node index.js          # MODE=generate par defaut : genere l'image + la legende dans posts/
cat data/pending.json  # relis la legende generee pour verifier qu'elle te plait
```
Ceci **ne publie rien**, ca genere seulement. La publication reelle se fait via l'etape 2
(`MODE=publish`), qui appelle ton webhook Make une fois l'image poussee sur GitHub.

---

## Anti-repetition

`data/history.json` memorise chaque produit poste avec sa date. Le bot ne repropose jamais un
produit poste dans les **21 derniers jours** (modifiable dans `lib/products.js`, parametre
`cooldownDays`). S'il ne reste plus aucun produit "frais", il reprend le plus ancien poste — le
cycle recommence sans jamais bloquer.

## Personnaliser le visuel

Le template de l'image (`lib/image.js`) est volontairement epure : logo texte, cadre photo,
bandeau prix. Tu peux changer les couleurs (`#1f2937`, `#facc15`), le nom de marque, ou la mise en
page a ce niveau. Si tu as un vrai logo (fichier PNG), dis-le-moi et je l'integre a la place du
texte.

## Si Make te demande un jour de repasser par l'API officielle Meta

Le plan gratuit de Make a des limites d'operations par mois (1000/mois), largement suffisantes
pour 1 post/jour (~30/mois). Si un jour tu factures beaucoup plus de contenu (plusieurs posts par
jour, Stories, Reels...), il faudra soit passer a un plan payant Make, soit repasser par l'API
Meta directement (voir version precedente du guide si besoin, gardee de cote).
