const { Client } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: '.env' });

const client = new Client({
  user: process.env.DB_USERNAME || 'priyankasharma',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'magnet_crm',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function main() {
  await client.connect();
  const res = await client.query("SELECT email, password, \"isActive\" FROM users WHERE email IN ('superadmin@magnetcrm.com', 'companyadmin@magnetcrm.com')");
  
  console.log(`Found ${res.rows.length} users.`);
  
  for (const user of res.rows) {
    const isMatch = await bcrypt.compare('password123', user.password);
    console.log(`Email: ${user.email}`);
    console.log(`  isActive: ${user.isActive}`);
    console.log(`  Hash: ${user.password}`);
    console.log(`  Password Match (password123): ${isMatch ? 'YES' : 'NO'}`);
  }
  
  await client.end();
}
main();
