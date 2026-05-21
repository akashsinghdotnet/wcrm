const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');
const crypto = require('crypto');

// Load env vars
dotenv.config({ path: '/home/magnetcrmak/htdocs/api.magnetcrm.com/.env' });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function parseCredentials(credentials) {
    if (typeof credentials === 'string') {
        try {
            return JSON.parse(credentials);
        } catch {
            return {};
        }
    }
    return credentials || {};
}

async function run() {
    console.log('🔍 Locating active Meta configuration...');

    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: Number(process.env.DB_PORT || 3306),
        });

        // Query the active configuration for Ajay Gangwar's page ID
        const targetPageId = '133556786499663';
        const [rows] = await connection.query(
            "SELECT * FROM integration_configs WHERE platform = 'meta' AND isActive = 1"
        );

        const config = rows.find(r => {
            const creds = parseCredentials(r.credentials);
            return String(creds.pageId || '').trim() === targetPageId;
        });

        if (!config) {
            console.error(`❌ FAIL: No active Meta integration configuration found for Page ID ${targetPageId}`);
            await connection.end();
            return;
        }

        const credentials = parseCredentials(config.credentials);
        const { accessToken, appSecret } = credentials;

        if (!accessToken) {
            console.error('❌ FAIL: Access token is missing.');
            await connection.end();
            return;
        }

        // 1. Exchange user token for Page Access Token
        let pageAccessToken = accessToken;
        let userAppsecretProof = '';
        if (appSecret) {
            userAppsecretProof = crypto
                .createHmac('sha256', appSecret)
                .update(accessToken)
                .digest('hex');
        }

        try {
            const accountsUrl = `https://graph.facebook.com/v21.0/me/accounts?access_token=${accessToken}` +
                (userAppsecretProof ? `&appsecret_proof=${userAppsecretProof}` : '');
            const accountsRes = await fetch(accountsUrl);
            if (accountsRes.ok) {
                const accountsData = await accountsRes.json();
                const pageAccount = accountsData.data?.find((acc) => String(acc.id) === String(targetPageId));
                if (pageAccount && pageAccount.access_token) {
                    pageAccessToken = pageAccount.access_token;
                    console.log(`✅ SUCCESS: Retrieved Page Access Token`);
                }
            }
        } catch (e) {
            console.warn(`⚠️ Warning fetching page token: ${e.message}`);
        }

        // 2. Fetch Leadgen Forms
        let pageAppsecretProof = '';
        if (appSecret) {
            pageAppsecretProof = crypto
                .createHmac('sha256', appSecret)
                .update(pageAccessToken)
                .digest('hex');
        }

        const formsUrl = `https://graph.facebook.com/v21.0/${targetPageId}/leadgen_forms?fields=name,id&access_token=${pageAccessToken}` +
            (pageAppsecretProof ? `&appsecret_proof=${pageAppsecretProof}` : '');
        
        const formsRes = await fetch(formsUrl);
        const formsData = await formsRes.json();

        if (formsData.error) {
            console.error(`❌ FAIL to fetch forms: ${formsData.error.message}`);
            await connection.end();
            return;
        }

        const forms = formsData.data || [];
        console.log(`📋 Found ${forms.length} form(s). Checking for leads to delete...`);

        for (const form of forms) {
            console.log(`\nChecking Form: "${form.name}" (ID: ${form.id})`);
            
            const leadsUrl = `https://graph.facebook.com/v21.0/${form.id}/leads?access_token=${pageAccessToken}` +
                (pageAppsecretProof ? `&appsecret_proof=${pageAppsecretProof}` : '');
            
            const leadsRes = await fetch(leadsUrl);
            const leadsData = await leadsRes.json();

            if (leadsData.error) {
                console.error(`  ❌ Error fetching leads: ${leadsData.error.message}`);
                continue;
            }

            const leads = leadsData.data || [];
            console.log(`  Found ${leads.length} lead(s) associated with this form.`);

            for (const lead of leads) {
                // Delete the lead
                console.log(`  Attempting to delete lead ID: ${lead.id}...`);
                const deleteUrl = `https://graph.facebook.com/v21.0/${lead.id}?access_token=${pageAccessToken}` +
                    (pageAppsecretProof ? `&appsecret_proof=${pageAppsecretProof}` : '');
                
                const deleteRes = await fetch(deleteUrl, { method: 'DELETE' });
                const deleteData = await deleteRes.json();

                if (deleteData.success) {
                    console.log(`    ✅ SUCCESS: Deleted lead ID ${lead.id}`);
                } else {
                    console.error(`    ❌ FAIL: Could not delete lead ID ${lead.id}. ${JSON.stringify(deleteData.error || deleteData)}`);
                }
            }
        }

        await connection.end();
        console.log('\n🏁 Finished cleaning up test leads.');
    } catch (err) {
        console.error(`❌ DB or Network error: ${err.message}`);
    }
}

run();
