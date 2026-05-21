const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');
const crypto = require('crypto');

// Load environmental variables using the exact path as the live app
dotenv.config({ path: '/home/magnetcrmak/htdocs/api.magnetcrm.com/.env' });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function diagnose() {
    console.log('🔍 Starting Facebook/Meta Lead Ads Diagnostics...\n');

    let connection;
    let credentialsList = [];

    try {
        console.log('🗄️ Connecting directly to MySQL Database...');
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: Number(process.env.DB_PORT || 3306),
        });

        console.log('✅ Connected to database. Querying all Meta Integration Configs...');
        const [rows] = await connection.query(
            "SELECT * FROM integration_configs WHERE platform = 'meta'"
        );

        if (rows.length === 0) {
            console.error('❌ FAIL: No Meta configurations found in the database.');
            await connection.end();
            process.exit(1);
        }

        console.log(`📋 Found ${rows.length} Meta configuration(s) in the database:\n`);
        
        for (const row of rows) {
            let creds = {};
            try {
                creds = typeof row.credentials === 'string' ? JSON.parse(row.credentials) : row.credentials;
            } catch (e) {}

            console.log(`  [Config ID: ${row.id}]`);
            console.log(`    - Company ID: "${row.companyId}"`);
            console.log(`    - Active Status: ${row.isActive ? '🟢 Active' : '🔴 Inactive'}`);
            console.log(`    - Page ID: "${creds?.pageId || 'None'}"`);
            console.log(`    - Has Access Token: ${creds?.accessToken ? 'Yes' : 'No'}`);
            console.log(`    - Has App Secret: ${creds?.appSecret ? 'Yes' : 'No'}`);
            console.log('    ------------------------------------------------');

            if (row.isActive && creds?.accessToken && creds?.pageId) {
                credentialsList.push({
                    companyId: row.companyId,
                    credentials: creds
                });
            }
        }

        await connection.end();

        if (credentialsList.length === 0) {
            console.error('❌ FAIL: No active Meta configurations with valid credentials (Page ID + Access Token) found.');
            process.exit(1);
        }
    } catch (dbErr) {
        console.error(`❌ DB CONNECTION ERROR: ${dbErr.message}`);
        process.exit(1);
    }

    // Run diagnostics for each active configuration
    for (const configItem of credentialsList) {
        const credentials = configItem.credentials;
        const companyId = configItem.companyId;
        
        const accessToken = credentials?.accessToken;
        const pageId = credentials?.pageId;
        const appSecret = credentials?.appSecret;

        console.log(`\n======================================================`);
        console.log(`🔍 Diagnosing Meta Connection for Company: "${companyId}"`);
        console.log(`======================================================`);
        console.log(`  - Page ID: "${pageId}"`);
        console.log(`  - App Secret: ${appSecret ? 'Configured (starts with ' + appSecret.substring(0, 4) + '...)' : 'MISSING'}`);
        console.log(`  - Access Token: ${accessToken ? 'Configured (starts with ' + accessToken.substring(0, 10) + '...)' : 'MISSING'}`);

        if (!accessToken || !pageId) {
            console.error('❌ FAIL: Missing Access Token or Page ID. Skipping Facebook API tests for this company.');
            continue;
        }

        // Generate appsecret_proof for User Access Token
        let userAppsecretProof = '';
        if (appSecret) {
            userAppsecretProof = crypto
                .createHmac('sha256', appSecret)
                .update(accessToken)
                .digest('hex');
        }

        // 1. Test Graph API Page access
        console.log('\n🌐 1. Fetching Page info from Facebook...');
        try {
            const pageUrl = `https://graph.facebook.com/v21.0/${pageId}?fields=name,category&access_token=${accessToken}` +
                (userAppsecretProof ? `&appsecret_proof=${userAppsecretProof}` : '');
            const pageRes = await fetch(pageUrl);
            const pageData = await pageRes.json();

            if (pageData.error) {
                console.error(`❌ FAIL: Facebook API returned error for page info: [${pageData.error.code}] ${pageData.error.message}`);
            } else {
                console.log(`✅ SUCCESS: Connected to Page "${pageData.name}" (${pageData.category})`);
            }
        } catch (e) {
            console.error(`❌ FAIL: Could not reach Facebook Page API: ${e.message}`);
        }

        // 2. Check Webhook Subscriptions
        console.log('\n🌐 2. Fetching current Webhook Subscriptions for this Page...');
        let pageAccessToken = accessToken;
        try {
            // Exchange User Access Token for Page Access Token if possible
            const accountsUrl = `https://graph.facebook.com/v21.0/me/accounts?access_token=${accessToken}` +
                (userAppsecretProof ? `&appsecret_proof=${userAppsecretProof}` : '');
            const accountsRes = await fetch(accountsUrl);
            if (accountsRes.ok) {
                const accountsData = await accountsRes.json();
                const pageAccount = accountsData.data?.find((acc) => String(acc.id) === String(pageId));
                if (pageAccount && pageAccount.access_token) {
                    pageAccessToken = pageAccount.access_token;
                    console.log(`✅ SUCCESS: Retrieved Page Access Token for Page ID ${pageId}`);
                } else {
                    console.log(`⚠️ WARNING: Selected Page ID was not found in the managed accounts of this user token.`);
                }
            }
        } catch (e) {
            console.error(`❌ FAIL: Failed to list managed accounts: ${e.message}`);
        }

        // Generate appsecret_proof for Page Access Token
        let pageAppsecretProof = '';
        if (appSecret) {
            pageAppsecretProof = crypto
                .createHmac('sha256', appSecret)
                .update(pageAccessToken)
                .digest('hex');
        }

        try {
            const subUrl = `https://graph.facebook.com/v21.0/${pageId}/subscribed_apps?access_token=${pageAccessToken}` +
                (pageAppsecretProof ? `&appsecret_proof=${pageAppsecretProof}` : '');
            const subRes = await fetch(subUrl);
            const subData = await subRes.json();

            if (subData.error) {
                console.error(`❌ FAIL: Facebook returned error when listing subscribed apps: [${subData.error.code}] ${subData.error.message}`);
            } else if (Array.isArray(subData.data)) {
                console.log(`✅ SUCCESS: Current Subscribed Apps on Page (total: ${subData.data.length}):`);
                for (const appItem of subData.data) {
                    console.log(`  - App Name: "${appItem.name}" | App ID: ${appItem.id}`);
                    console.log(`    Subscribed fields: ${JSON.stringify(appItem.subscribed_fields || [])}`);
                }
                const isSubscribedToLeadgen = subData.data.some((appItem) => 
                    appItem.subscribed_fields?.includes('leadgen')
                );
                if (!isSubscribedToLeadgen) {
                    console.error(`❌ FAIL: The page is NOT subscribed to 'leadgen' fields for any app. Webhooks will not be delivered.`);
                } else {
                    console.log(`🎉 SUCCESS: Page is active and subscribed to 'leadgen' events!`);
                }
            } else {
                console.log(`⚠️ Unexpected response format: ${JSON.stringify(subData)}`);
            }
        } catch (e) {
            console.error(`❌ FAIL: Failed to query subscribed apps: ${e.message}`);
        }

        // 3. Test Webhook Callback URL verification
        console.log('\n🖥️ 3. Testing Webhook Callback Endpoint (Verification)...');
        try {
            const testChallenge = `challenge_test_${Math.floor(Math.random() * 100000)}`;
            const localWebhookUrl = `http://localhost:3000/api/webhooks/meta?hub.mode=subscribe&hub.verify_token=magnet-crm&hub.challenge=${testChallenge}`;
            const localRes = await fetch(localWebhookUrl);
            const bodyText = await localRes.text();
            const contentType = localRes.headers.get('content-type') || '';

            console.log(`  - GET Request to: ${localWebhookUrl}`);
            console.log(`  - Status Code: ${localRes.status}`);
            console.log(`  - Content-Type: "${contentType}"`);
            console.log(`  - Response Body: "${bodyText}"`);

            if (bodyText === testChallenge) {
                console.log('✅ SUCCESS: Webhook verification returns the exact challenge string (Plain text matches).');
            } else if (bodyText.includes(testChallenge)) {
                console.error(`❌ FAIL: Webhook returned the challenge inside quotes or JSON wrappers: "${bodyText}". This will fail Facebook\'s validation!`);
            } else {
                console.error(`❌ FAIL: Webhook did not return the challenge string.`);
            }
        } catch (e) {
            console.log(`⚠️ Note: Local server is not running on port 3000 (${e.message}). Skipping local webhook test.`);
        }
    }

    console.log('\n🏁 Diagnostics complete.');
}

diagnose().catch(err => {
    console.error('Fatal diagnostics error:', err);
    process.exit(1);
});
