// Usage: node scripts/hash-password.js VotreNouveauMotDePasse
// Copiez le hash généré dans la variable ADMIN_PASSWORD_HASH de votre fichier .env
const bcrypt = require('bcryptjs');

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/hash-password.js VotreNouveauMotDePasse');
  process.exit(1);
}
if (password.length < 8) {
  console.error('Choisissez un mot de passe d\'au moins 8 caractères.');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);
console.log('\nAjoutez cette ligne dans votre fichier .env :\n');
console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
