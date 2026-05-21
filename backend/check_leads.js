const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

// Load environmental variables using the exact path as the live app
dotenv.config({ path: '/home/magnetcrmak/htdocs/api.magnetcrm.com/.env' });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function run() {
    console.log('🔍 Checking Leads in Database...\n');

    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: Number(process.env.DB_PORT || 3306),
        });

        const targetCompanyId = '57835977-69a9-40ed-988b-5ca829f113e4';

        // 1. Get total leads
        const [totalRows] = await connection.query(
            "SELECT COUNT(*) as count FROM leads WHERE companyId = ?",
            [targetCompanyId]
        );
        console.log(`📊 Total leads for Company ${targetCompanyId}: ${totalRows[0].count}`);

        // 2. Get leads grouped by source
        const [sourceRows] = await connection.query(
            "SELECT source, COUNT(*) as count FROM leads WHERE companyId = ? GROUP BY source",
            [targetCompanyId]
        );
        console.log('\n📊 Leads count by source:');
        for (const row of sourceRows) {
            console.log(`  - ${row.source || 'NULL/Unknown'}: ${row.count}`);
        }

        // 3. Get latest 5 leads
        const [latestRows] = await connection.query(
            "SELECT id, name, phone, email, source, createdAt FROM leads WHERE companyId = ? ORDER BY createdAt DESC LIMIT 5",
            [targetCompanyId]
        );
        console.log('\n📊 Latest 5 leads:');
        for (const lead of latestRows) {
            console.log(`  - Name: "${lead.name}" | Source: "${lead.source}" | Email: "${lead.email || 'None'}" | Phone: "${lead.phone || 'None'}" | Created: ${lead.createdAt}`);
        }

        await connection.end();
    } catch (err) {
        console.error(`❌ DB error: ${err.message}`);
    }
}

run();
