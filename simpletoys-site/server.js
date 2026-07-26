require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Vérification de la config au démarrage ----------
const REQUIRED_ENV = ['JWT_SECRET', 'ADMIN_PASSWORD_HASH', 'EMAIL_USER', 'EMAIL_APP_PASSWORD'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.warn(`⚠️  Variables d'environnement manquantes: ${missing.join(', ')}. Voir le fichier .env.example`);
}

// ---------- Sécurité de base ----------
app.use(helmet({ contentSecurityPolicy: false })); // le front utilise des CDN (Tailwind, Font Awesome)
app.use(cors({ origin: process.env.SITE_URL || true, credentials: true }));
app.use(express.json({ limit: '200kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const orderLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Trop de commandes envoyées. Réessayez plus tard.' } });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: 'Trop de tentatives de connexion. Réessayez plus tard.' } });
const trackLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: { error: 'Trop de tentatives. Réessayez plus tard.' } });

// ---------- Données ----------
const PRODUCTS_FILE = path.join(__dirname, 'data', 'products.json');
const ORDERS_FILE = path.join(__dirname, 'data', 'orders.json');

function loadProducts() { return JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf-8')); }
function loadOrders() { return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf-8')); }
function saveOrders(orders) { fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2)); }

// Statuts possibles d'une commande, dans l'ordre du cycle de vie
const ORDER_STATUSES = ['nouvelle', 'preparation', 'expediee', 'livree', 'annulee'];
const STATUS_LABELS_FR = {
  nouvelle: 'Nouvelle commande',
  preparation: 'En préparation',
  expediee: 'Expédiée',
  livree: 'Livrée',
  annulee: 'Annulée'
};

// ---------- Email (Gmail via mot de passe d'application) ----------
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_APP_PASSWORD }
});

function orderNumber(order) {
  const d = new Date(order.createdAt);
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `CMD${ymd}-${order.id}`;
}

async function sendOrderEmails(order) {
  const itemsHtml = order.items.map(it =>
    `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee;">RÉF ${it.ref} — ${it.name}</td>
     <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center;">${it.qty}</td>
     <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;">${it.price.toFixed(2)} DHS</td>
     <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;">${(it.price * it.qty).toFixed(2)} DHS</td></tr>`
  ).join('');

  const num = orderNumber(order);

  const adminHtml = `
    <h2>Nouvelle commande ${num}</h2>
    <p><strong>Client:</strong> ${order.customer.name} — ${order.customer.company}</p>
    <p><strong>Email:</strong> ${order.customer.email} | <strong>Tél:</strong> ${order.customer.phone}</p>
    <p><strong>Ville/Pays:</strong> ${order.customer.city}</p>
    <p><strong>Adresse de livraison:</strong> ${order.customer.address || '—'}</p>
    <p><strong>Instructions:</strong> ${order.customer.notes || '—'}</p>
    <p><strong>Paiement:</strong> Espèces à la livraison</p>
    <table style="border-collapse:collapse;width:100%;">${itemsHtml}</table>
    <p style="font-size:18px;"><strong>Total: ${order.total.toFixed(2)} DHS</strong></p>
  `;

  const customerHtml = `
    <h2>Merci pour votre commande, ${order.customer.name} !</h2>
    <p>Votre commande <strong>${num}</strong> a bien été reçue chez Simple Toys Maroc.</p>
    <p><strong>Paiement :</strong> en espèces, à la réception de votre commande.</p>
    <table style="border-collapse:collapse;width:100%;">${itemsHtml}</table>
    <p style="font-size:18px;"><strong>Total: ${order.total.toFixed(2)} DHS</strong></p>
    <p>Vous pouvez suivre l'état de votre commande à tout moment sur notre site, section « Suivre ma commande », avec le numéro <strong>${num}</strong>.</p>
    <p>Notre équipe vous contactera sous 24h au ${order.customer.phone}.</p>
    <p>— L'équipe Simple Toys Maroc<br>Derb Omar, Casablanca | 0661 13 88 31</p>
  `;

  await transporter.sendMail({
    from: `"Simple Toys Maroc" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    subject: `🛒 Nouvelle commande ${num} — ${order.total.toFixed(2)} DHS`,
    html: adminHtml
  });

  await transporter.sendMail({
    from: `"Simple Toys Maroc" <${process.env.EMAIL_USER}>`,
    to: order.customer.email,
    subject: `Confirmation de votre commande ${num} — Simple Toys Maroc`,
    html: customerHtml
  });
}

async function sendStatusUpdateEmail(order) {
  const num = orderNumber(order);
  const label = STATUS_LABELS_FR[order.status] || order.status;
  const html = `
    <h2>Mise à jour de votre commande ${num}</h2>
    <p>Bonjour ${order.customer.name},</p>
    <p>Le statut de votre commande vient de changer :</p>
    <p style="font-size:20px;"><strong>${label}</strong></p>
    <p>Vous pouvez suivre votre commande à tout moment sur notre site avec le numéro <strong>${num}</strong>.</p>
    <p>— L'équipe Simple Toys Maroc<br>0661 13 88 31</p>
  `;
  await transporter.sendMail({
    from: `"Simple Toys Maroc" <${process.env.EMAIL_USER}>`,
    to: order.customer.email,
    subject: `Votre commande ${num} — ${label}`,
    html
  });
}

// ---------- Validation & calcul serveur du panier (prix fixe, anti-triche) ----------
function buildValidatedOrder(items) {
  const products = loadProducts();
  if (!Array.isArray(items) || items.length === 0) throw new Error('Panier vide.');
  const validated = items.map(it => {
    const p = products.find(pr => pr.ref === String(it.ref));
    if (!p) throw new Error(`Produit inconnu: ${it.ref}`);
    const qty = parseInt(it.qty, 10);
    if (!Number.isInteger(qty) || qty < 1) throw new Error(`Quantité invalide pour ${p.name}.`);
    return { ref: p.ref, name: p.name, price: p.price, qty };
  });
  const total = validated.reduce((sum, it) => sum + it.price * it.qty, 0);
  return { items: validated, total };
}

// ---------- Routes publiques ----------
app.get('/api/products', (req, res) => {
  res.json(loadProducts());
});

app.post('/api/orders',
  orderLimiter,
  [
    body('customer.name').trim().isLength({ min: 2, max: 100 }).escape(),
    body('customer.company').optional({ checkFalsy: true }).trim().isLength({ max: 100 }).escape(),
    body('customer.email').trim().isEmail().normalizeEmail(),
    body('customer.phone').trim().isLength({ min: 6, max: 30 }).escape(),
    body('customer.city').trim().isLength({ min: 2, max: 100 }).escape(),
    body('customer.address').trim().isLength({ min: 5, max: 300 }).escape(),
    body('customer.notes').optional({ checkFalsy: true }).trim().isLength({ max: 500 }).escape(),
    body('items').isArray({ min: 1 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Champs invalides', details: errors.array() });

    try {
      const { items, total } = buildValidatedOrder(req.body.items);
      const orders = loadOrders();
      const order = {
        id: Date.now().toString(36).toUpperCase(),
        createdAt: new Date().toISOString(),
        customer: req.body.customer,
        items,
        total,
        paymentMethod: 'cod',
        status: 'nouvelle',
        statusHistory: [{ status: 'nouvelle', at: new Date().toISOString() }]
      };
      orders.push(order);
      saveOrders(orders);

      // L'email part en arrière-plan : le client n'attend pas Gmail pour avoir sa confirmation.
      sendOrderEmails(order).catch(e => console.error('Erreur envoi email:', e.message));

      res.json({ success: true, orderId: order.id, orderNumber: orderNumber(order), total: order.total });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  }
);

// Suivi de commande public : le client doit fournir l'ID de commande + email OU téléphone (anti-fuite d'info)
app.post('/api/orders/track', trackLimiter,
  [
    body('orderId').trim().isLength({ min: 3, max: 30 }).escape(),
    body('contact').trim().isLength({ min: 3, max: 100 })
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Merci de renseigner le numéro de commande et votre email ou téléphone.' });

    const orders = loadOrders();
    const contact = req.body.contact.trim().toLowerCase();
    const order = orders.find(o =>
      o.id.toLowerCase() === req.body.orderId.trim().toLowerCase() &&
      (o.customer.email.toLowerCase() === contact || o.customer.phone.replace(/\s/g, '') === req.body.contact.trim().replace(/\s/g, ''))
    );
    if (!order) return res.status(404).json({ error: 'Aucune commande trouvée avec ces informations.' });

    res.json({
      orderNumber: orderNumber(order),
      status: order.status,
      statusLabel: STATUS_LABELS_FR[order.status] || order.status,
      statusHistory: order.statusHistory || [],
      total: order.total,
      items: order.items,
      createdAt: order.createdAt
    });
  }
);

// ---------- Admin sécurisé (mot de passe hashé + JWT) ----------
app.post('/api/admin/login', loginLimiter, async (req, res) => {
  const { password } = req.body;
  if (!password || !process.env.ADMIN_PASSWORD_HASH) return res.status(401).json({ error: 'Accès refusé.' });
  const ok = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
  if (!ok) return res.status(401).json({ error: 'Mot de passe incorrect.' });
  const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
});

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Non autorisé.' });
  try { jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: 'Session expirée, reconnectez-vous.' }); }
}

app.get('/api/admin/orders', requireAdmin, (req, res) => {
  const orders = loadOrders().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(orders.map(o => ({ ...o, orderNumberDisplay: orderNumber(o) })));
});

app.patch('/api/admin/orders/:id/status', requireAdmin,
  [body('status').isIn(ORDER_STATUSES)],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Statut invalide.' });

    const orders = loadOrders();
    const order = orders.find(o => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' });

    order.status = req.body.status;
    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({ status: req.body.status, at: new Date().toISOString() });
    saveOrders(orders);

    sendStatusUpdateEmail(order).catch(e => console.error('Erreur envoi email statut:', e.message));

    res.json({ success: true });
  }
);

app.delete('/api/admin/orders/:id', requireAdmin, (req, res) => {
  let orders = loadOrders();
  orders = orders.filter(o => o.id !== req.params.id);
  saveOrders(orders);
  res.json({ success: true });
});

app.get('/api/admin/products', requireAdmin, (req, res) => {
  res.json(loadProducts());
});

app.post('/api/admin/products', requireAdmin, (req, res) => {
  const products = loadProducts();
  const { ref, name, price, qty, cat } = req.body;
  if (!ref || !name || price == null || qty == null || !cat) return res.status(400).json({ error: 'Champs manquants.' });
  const idx = products.findIndex(p => p.ref === String(ref));
  const entry = { ref: String(ref), name, price: parseFloat(price), qty: parseInt(qty, 10), cat };
  if (idx >= 0) products[idx] = entry; else products.push(entry);
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
  res.json({ success: true });
});

app.delete('/api/admin/products/:ref', requireAdmin, (req, res) => {
  let products = loadProducts();
  products = products.filter(p => p.ref !== req.params.ref);
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
  res.json({ success: true });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`✅ Simple Toys Maroc — serveur démarré sur le port ${PORT}`));
