const fs = require('fs');
const path = require('path');
const { fetchProducts, pickNextProduct, SITE_URL } = require('./lib/products');
const { generateCaption } = require('./lib/caption');
const { buildPostImage } = require('./lib/image');
const { publishToInstagram } = require('./lib/instagram');
const { loadHistory, recordPost } = require('./lib/history');

const POSTS_DIR = path.join(__dirname, 'posts');
const PENDING_FILE = path.join(__dirname, 'data', 'pending.json');
const MODE = process.env.MODE || 'generate'; // 'generate' puis 'publish' (deux etapes, voir workflow)

const REPO = process.env.GITHUB_REPOSITORY; // fourni automatiquement par GitHub Actions
const BRANCH = process.env.GITHUB_REF_NAME || 'main';

function rawUrl(filename) {
  return `https://raw.githubusercontent.com/${REPO}/${BRANCH}/instagram-bot/posts/${filename}`;
}

// ---------- ETAPE 1 : choisir un produit, generer image + legende, sauver localement ----------
async function generateStep() {
  console.log('🧸 Simple Toys Maroc — generation du post du jour');

  console.log('1/4 — Recuperation du catalogue...');
  const products = await fetchProducts();
  if (products.length === 0) throw new Error('Aucun produit avec photo trouve sur le site.');
  console.log(`   ${products.length} produits avec photo disponibles.`);

  const history = loadHistory();
  const product = pickNextProduct(products, history);
  console.log(`2/4 — Produit choisi : [${product.ref}] ${product.name}`);

  console.log('3/4 — Generation de la legende (FR + Darija + hashtags)...');
  const caption = await generateCaption(product);

  console.log('4/4 — Generation du visuel...');
  const photoRes = await fetch(`${SITE_URL}${product.image}`);
  if (!photoRes.ok) throw new Error(`Impossible de telecharger la photo produit (${product.image})`);
  const photoBuffer = Buffer.from(await photoRes.arrayBuffer());
  const finalImage = await buildPostImage(photoBuffer, product);

  if (!fs.existsSync(POSTS_DIR)) fs.mkdirSync(POSTS_DIR, { recursive: true });
  const filename = `${new Date().toISOString().slice(0, 10)}-${product.ref}.jpg`;
  fs.writeFileSync(path.join(POSTS_DIR, filename), finalImage);

  fs.mkdirSync(path.dirname(PENDING_FILE), { recursive: true });
  fs.writeFileSync(PENDING_FILE, JSON.stringify({ ref: product.ref, filename, caption }, null, 2));

  console.log(`✅ Image et legende pretes : posts/${filename}`);
  console.log('   (Le workflow va maintenant committer + pousser avant de publier.)');
}

// ---------- ETAPE 2 : une fois l'image poussee sur GitHub, publier sur Instagram ----------
async function publishStep() {
  if (!fs.existsSync(PENDING_FILE)) throw new Error('Aucun post en attente (data/pending.json introuvable).');
  const pending = JSON.parse(fs.readFileSync(PENDING_FILE, 'utf-8'));

  console.log('Publication sur Instagram...');
  const publicUrl = rawUrl(pending.filename);
  console.log(`   URL publique utilisee : ${publicUrl}`);

  const result = await publishToInstagram(publicUrl, pending.caption);
  console.log('✅ Publie avec succes, media id:', result.id);

  const history = loadHistory();
  recordPost(history, { ref: pending.ref, caption: pending.caption });
  fs.unlinkSync(PENDING_FILE);
  console.log('Historique mis a jour, pending.json supprime.');
}

const run = MODE === 'publish' ? publishStep : generateStep;
run().catch(err => {
  console.error('❌ Erreur:', err.message);
  process.exit(1);
});
