const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // optionnel

// ---------- Banques de variations (fallback gratuit, sans aucune cle) ----------
const HOOKS_FR = [
  "Nouveau coup de cœur du jour ✨",
  "On vous le présente aujourd'hui 👇",
  "Le produit qui fait plaisir aux enfants 🎁",
  "Disponible dès maintenant chez nous 🧸",
  "Un classique toujours autant demandé 🔥",
  "Idée cadeau parfaite pour bientôt 🎈"
];
const TRUST_FR = [
  "Qualité vérifiée, stock disponible à Casablanca.",
  "Livraison rapide, paiement à la réception.",
  "Des centaines de familles nous font déjà confiance.",
  "Produit contrôlé avant chaque envoi.",
  "Simple Toys Maroc, votre vendeur de jouets à Casablanca."
const CTA_FR = [
  "Commandez dès aujourd'hui, stock limité !",
  "Contactez-nous en message privé pour commander.",
  "Disponible en gros et détail, appelez-nous !",
  "Passez commande avant rupture de stock."
];

const HOOKS_DARIJA = [
  "شي حاجة جديدة اليوم ✨",
  "هادشي كاين عندنا دابا 👇",
  "لعبة كتفرح الدراري 🎁",
  "متوفرة دابا عندنا 🧸",
  "بضاعة كتطلب بزاف 🔥"
];
const TRUST_DARIJA = [
  "جودة مضمونة، الستوك متوفر فالكازا.",
  "توصيل سريع، الخلاص عند الاستلام.",
  "بزاف ديال الناس واثقين فينا.",
  "Simple Toys Maroc، الموردين ديال اللعب فدرب عمر."
];
const CTA_DARIJA = [
  "طلبو دابا، الستوك محدود!",
  "تواصلو معانا فرسالة خاصة باش تطلبو.",
  "كاينة بالجملة والتفصيل، عيطو لينا!",
  "بادرو قبل ما توصل السلعة."
];

const HASHTAG_POOL = [
  '#Casablanca', '#CasaCity', '#Maroc', '#MarocShopping', '#CasablancaShopping',
  '#JouetsMaroc', '#ToysMorocco', '#CadeauEnfant', '#SimpleToysMaroc',
  '#JouetsCasablanca', '#GrossisteJouets', '#كازابلانكا', '#المغرب',
  '#لعب_الاطفال', '#تسوق_المغرب'
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function pickHashtags(n = 8) {
  const shuffled = [...HASHTAG_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n).join(' ');
}

function localCaption(product) {
  const caption =
    `${pick(HOOKS_FR)}\n` +
    `${product.name} — ${product.price.toFixed(2)} DHS\n` +
    `${pick(TRUST_FR)}\n` +
    `${pick(CTA_FR)}\n\n` +
    `${pick(HOOKS_DARIJA)}\n` +
    `${product.name} ب ${product.price.toFixed(2)} درهم\n` +
    `${pick(TRUST_DARIJA)}\n` +
    `${pick(CTA_DARIJA)}\n\n` +
    `${pickHashtags()}`;
  return caption;
}

/**
 * Genere une legende via Gemini (gratuit, cle perso sur ai.google.dev) si une
 * cle est configuree, sinon retombe automatiquement sur le generateur local
 * (qui ne demande aucune cle et varie deja chaque jour).
 */
async function generateCaption(product) {
  if (!GEMINI_API_KEY) return localCaption(product);

  const prompt = 'Tu es le community manager de "Simple Toys Maroc", un vendeur de jouets a Casablanca.
Ecris une legende Instagram COURTE pour ce produit :
- Nom : ${product.name}
- Prix : ${product.price} DHS
- Categorie : ${product.cat}

Contraintes strictes :
1. D'abord un paragraphe en francais (2-3 phrases, chaleureux, qui inspire confiance, mentionne le prix et Casablanca).
2. Ensuite un paragraphe en darija marocaine (ecrite en arabe), qui reprend l'idee sans traduire mot a mot.
3. Termine par 8 hashtags pertinents visant Casablanca et le Maroc, melange francais/arabe/anglais.
4. Pas d'emojis excessifs (2-4 maximum au total). Pas de guillemets autour du texte. Reponds uniquement avec la legende finale, rien d'autre.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    );
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) throw new Error('Reponse Gemini vide');
    return text;
  } catch (err) {
    console.warn('⚠️ Gemini indisponible, repli sur la legende locale:', err.message);
    return localCaption(product);
  }
}

module.exports = { generateCaption, localCaption };
