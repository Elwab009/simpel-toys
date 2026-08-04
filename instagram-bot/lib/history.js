const fs = require('fs');
const path = require('path');

const HISTORY_FILE = path.join(__dirname, '..', 'data', 'history.json');

function loadHistory() {
  if (!fs.existsSync(HISTORY_FILE)) return { posts: [] };
  return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
}

function recordPost(history, { ref, caption }) {
  history.posts.push({ ref, date: new Date().toISOString(), caption });
  // On garde un historique raisonnable (les 500 derniers posts suffisent largement)
  if (history.posts.length > 500) history.posts = history.posts.slice(-500);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
  return history;
}

module.exports = { loadHistory, recordPost, HISTORY_FILE };
