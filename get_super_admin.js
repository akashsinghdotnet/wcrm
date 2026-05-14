const { Client } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const client = new Client({
  user: process.env.DB_USERNAME || 'priyankasharma',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'magnet_crm',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function main() {
  try {
    await client.connect();
    console.log('Connected to the database. Fetching Super Admin accounts...');
    
    const res = await client.query("SELECT email, name FROM users WHERE role = 'super_admin'");
    
    if (res.rows.length === 0) {
      console.log('No Super Admin accounts found in the database!');
    } else {
      console.log('\n--- Super Admin Accounts ---');
      res.rows.forEach((row, i) => {
        console.log(`${i + 1}. Name: ${row.name || 'N/A'}, Email: ${row.email}`);
      });
      console.log('----------------------------\n');
      console.log('If you forgot the password, let me know and I can write a script to reset it for you.');
    }
  } catch (err) {
    console.error('Database connection error:', err.message);
  } finally {
    await client.end();
  }
}

main();
