const sharp = require('sharp');

const CANVAS = 1080;
const BRAND = 'SIMPLE TOYS MAROC';
const BRAND_SUB = 'Derb Omar — Casablanca';

const CATEGORY_PALETTES = {
  'Véhicules & RC':      { band: '#1e3a5f', price: '#38bdf8' },
  'Poupées & Filles':    { band: '#7c2d5c', price: '#f9a8d4' },
  'Jeux de Rôle':        { band: '#3f6212', price: '#bef264' },
  'Figurines & Héros':   { band: '#7c2d12', price: '#fb923c' },
  'Jouets & Accessoires':{ band: '#1f2937', price: '#facc15' },
};
const DEFAULT_PALETTE = CATEGORY_PALETTES['Jouets & Accessoires'];

function paletteFor(category) {
  return CATEGORY_PALETTES[category] || DEFAULT_PALETTE;
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function wrapText(text, maxCharsPerLine = 26) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const w of words) {
    if ((current + ' ' + w).trim().length > maxCharsPerLine) {
      lines.push(current.trim());
      current = w;
    } else {
      current = (current + ' ' + w).trim();
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 2);
}

async function buildPostImage(productImageBuffer, product) {
  const padding = 70;
  const photoSize = CANVAS - padding * 2 - 180;
  const photoTop = 150;
  const photoLeft = Math.round((CANVAS - photoSize) / 2);

  const photo = await sharp(productImageBuffer)
    .resize(photoSize, photoSize, { fit: 'contain', background: '#ffffff' })
    .toBuffer();

  const nameLines = wrapText(product.name);
  const nameSvgLines = nameLines
    .map((line, i) => `<tspan x="50%" dy="${i === 0 ? 0 : 44}">${escapeXml(line)}</tspan>`)
    .join('');
  const { band: bandColor, price: priceColor } = paletteFor(product.cat);

  const overlay = `
  <svg width="${CANVAS}" height="${CANVAS}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${CANVAS}" height="${CANVAS}" fill="#ffffff"/>
    <text x="50%" y="70" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
          font-size="30" font-weight="700" letter-spacing="4" fill="#1f2937">${escapeXml(BRAND)}</text>
    <text x="50%" y="105" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
          font-size="20" fill="#6b7280">${escapeXml(BRAND_SUB)}</text>
    <line x1="${padding}" y1="128" x2="${CANVAS - padding}" y2="128" stroke="#e5e7eb" stroke-width="2"/>
    <rect x="${photoLeft - 2}" y="${photoTop - 2}" width="${photoSize + 4}" height="${photoSize + 4}"
          fill="none" stroke="#e5e7eb" stroke-width="2" rx="18"/>
    <rect x="0" y="${CANVAS - 190}" width="${CANVAS}" height="190" fill="${bandColor}"/>
    <text x="50%" y="${CANVAS - 128}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
          font-size="34" font-weight="600" fill="#ffffff">${nameSvgLines}</text>
    <text x="50%" y="${CANVAS - 32}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
          font-size="42" font-weight="800" fill="${priceColor}">${escapeXml(product.price.toFixed(2))} DHS</text>
  </svg>`;

  return sharp({
    create: { width: CANVAS, height: CANVAS, channels: 3, background: '#ffffff' }
  })
    .composite([
      { input: Buffer.from(overlay), top: 0, left: 0 },
      { input: photo, top: photoTop, left: photoLeft }
    ])
    .jpeg({ quality: 92 })
    .toBuffer();
}

module.exports = { buildPostImage, CANVAS };
