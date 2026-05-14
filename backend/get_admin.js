const { Client } = require('pg');
const client = new Client({
  user: 'priyankasharma',
  host: 'localhost',
  database: 'magnet_crm',
  password: 'postgres',
  port: 5432,
});

async function main() {
  await client.connect();
  const res = await client.query("SELECT email FROM users WHERE role = 'super_admin'");
  console.log('Super admins:', res.rows);
  await client.end();
}
main().catch(console.error);
