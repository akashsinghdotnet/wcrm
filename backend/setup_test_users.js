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
  try {
    await client.connect();
    
    // Hash password "password123"
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // 1. Handle Super Admin
    const superAdminRes = await client.query("SELECT * FROM users WHERE role = 'super_admin' LIMIT 1");
    let superAdminEmail;
    
    if (superAdminRes.rows.length === 0) {
      console.log('No Super Admin found. Creating one...');
      superAdminEmail = 'superadmin@magnetcrm.com';
      await client.query(
        "INSERT INTO users (email, password, role, name, \"isActive\") VALUES ($1, $2, $3, $4, $5)",
        [superAdminEmail, hashedPassword, 'super_admin', 'System Admin', true]
      );
      console.log(`Created Super Admin: ${superAdminEmail}`);
    } else {
      superAdminEmail = superAdminRes.rows[0].email;
      console.log(`Found existing Super Admin: ${superAdminEmail}`);
      await client.query("UPDATE users SET password = $1 WHERE email = $2", [hashedPassword, superAdminEmail]);
      console.log('Updated Super Admin password.');
    }

    // 2. Handle Company Admin
    const companyAdminRes = await client.query("SELECT * FROM users WHERE role = 'admin' AND \"companyId\" IS NOT NULL LIMIT 1");
    let companyAdminEmail;
    
    if (companyAdminRes.rows.length === 0) {
      console.log('No Company Admin found. We need a company first...');
      
      const companyRes = await client.query("SELECT * FROM companies LIMIT 1");
      let companyId;
      
      if (companyRes.rows.length === 0) {
        console.log('No Companies found. Creating a test company...');
        const newCompany = await client.query(
          "INSERT INTO companies (\"companyName\", \"email\", \"subscriptionStatus\") VALUES ($1, $2, $3) RETURNING id",
          ['Test Company Inc', 'testcompany@magnetcrm.com', 'active']
        );
        companyId = newCompany.rows[0].id;
        console.log(`Created test company with ID: ${companyId}`);
      } else {
        companyId = companyRes.rows[0].id;
        console.log(`Found existing company with ID: ${companyId}`);
      }

      companyAdminEmail = 'companyadmin@magnetcrm.com';
      await client.query(
        "INSERT INTO users (email, password, role, name, \"isActive\", \"companyId\") VALUES ($1, $2, $3, $4, $5, $6)",
        [companyAdminEmail, hashedPassword, 'admin', 'Company Admin', true, companyId]
      );
      console.log(`Created Company Admin: ${companyAdminEmail}`);
    } else {
      companyAdminEmail = companyAdminRes.rows[0].email;
      console.log(`Found existing Company Admin: ${companyAdminEmail}`);
      await client.query("UPDATE users SET password = $1 WHERE email = $2", [hashedPassword, companyAdminEmail]);
      console.log('Updated Company Admin password.');
    }

    console.log('\n====================================');
    console.log('✅ TEST CREDENTIALS READY (Local DB)');
    console.log('====================================');
    console.log(`\n👑 Super Admin:`);
    console.log(`   Email:    ${superAdminEmail}`);
    console.log(`   Password: password123`);
    console.log(`\n🏢 Company Admin:`);
    console.log(`   Email:    ${companyAdminEmail}`);
    console.log(`   Password: password123`);
    console.log('====================================\n');
    
  } catch (err) {
    console.error('Database connection error:', err.message);
  } finally {
    await client.end();
  }
}

main();
