const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL;

/**
 * Envoie l'image + la legende au scenario Make.com, qui se charge lui-meme
 * de publier sur Instagram (deja connecte via Facebook login, aucune cle
 * Meta Graph API necessaire de notre cote).
 */
async function publishToInstagram(imageUrl, caption) {
  if (!imageUrl || !caption) {
    throw new Error(`Donnees incompletes, publication annulee (imageUrl=${imageUrl}, caption=${caption ? 'ok' : 'vide'}).`);
  }
  if (!MAKE_WEBHOOK_URL) {

  const res = await fetch(MAKE_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photo_url: imageUrl, caption })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Echec appel webhook Make (HTTP ${res.status}): ${text}`);
  }

  return { ok: true };
}

module.exports = { publishToInstagram };
