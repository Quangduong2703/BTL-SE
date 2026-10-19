require('dotenv').config();
const pool = require('../db');

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error('Usage: node scripts/make-admin.js <email>');
    process.exit(1);
  }

  const [result] = await pool.query(
    `UPDATE Users
     SET role = 'admin', status = 'active'
     WHERE email = ?`,
    [email]
  );

  if (result.affectedRows === 0) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  console.log(`Promoted ${email} to admin.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
