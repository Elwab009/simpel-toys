const SITE_URL = process.env.SITE_URL || 'https://simpel-toys-production.up.railway.app';

/**
 * Recupere le catalogue public du site (route deja existante : /api/products).
 */
async function fetchProducts() {
  const res = await fetch(`${SITE_URL}/api/products`);
  if (!res.ok) throw new Error(`Impossible de recuperer les produits (HTTP ${res.status})`);
  const products = await res.json();
  // On ne garde que les produits qui ont une vraie photo (sinon le post n'a rien a montrer)
  return products.filter(p => p.image);
}

/**
 * Choisit le produit a poster aujourd'hui en evitant tout produit deja poste
 * dans les `cooldownDays` derniers jours. Si tous les produits ont ete postes
 * recemment, on prend simplement le moins recent de tous (le cycle recommence).
 */
function pickNextProduct(products, history, cooldownDays = 21) {
  const now = Date.now();
  const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;

  const lastPostedAt = ref => {
    const entry = history.posts.find(p => p.ref === ref);
    return entry ? new Date(entry.date).getTime() : 0; // 0 = jamais poste => priorite max
  };

  const eligible = products.filter(p => now - lastPostedAt(p.ref) > cooldownMs);
  const pool = eligible.length > 0 ? eligible : products;

  // Parmi les eligibles, on prend le plus ancien poste (ou jamais poste), en cassant
  // les egalites au hasard pour ne pas toujours suivre le meme ordre de catalogue.
  const sorted = [...pool].sort((a, b) => lastPostedAt(a.ref) - lastPostedAt(b.ref));
  const oldestTimestamp = lastPostedAt(sorted[0].ref);
  const tied = sorted.filter(p => lastPostedAt(p.ref) === oldestTimestamp);

  return tied[Math.floor(Math.random() * tied.length)];
}

module.exports = { fetchProducts, pickNextProduct, SITE_URL };
