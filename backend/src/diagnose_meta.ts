import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Repository } from 'typeorm';
import { IntegrationConfig, IntegrationPlatform } from './integrations/integration-config.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load env from possible paths: same directory, parent directory, and parent's parent
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function diagnose() {
    console.log('🔍 Starting Facebook/Meta Lead Ads Diagnostics...\n');

    // 1. Boot NestJS context
    console.log('⚙️ Loading CRM Application Context...');
    const app = await NestFactory.createApplicationContext(AppModule);
    const configRepo = app.get<Repository<IntegrationConfig>>(getRepositoryToken(IntegrationConfig));

    // 2. Load Meta Integration from database
    console.log('🗄️ Querying active Meta Integration Config...');
    const configs = await configRepo.find({
        where: { platform: IntegrationPlatform.META, isActive: true }
    });

    if (configs.length === 0) {
        console.error('❌ FAIL: No active Meta configuration found in the database. Please configure and activate Meta in your CRM dashboard first.');
        await app.close();
        process.exit(1);
    }

    const config = configs[0];
    const { accessToken, pageId, appSecret } = config.credentials || {};

    console.log(`\n📋 Stored Credentials:`);
    console.log(`  - Page ID: "${pageId}"`);
    console.log(`  - App Secret: ${appSecret ? 'Configured (starts with ' + appSecret.substring(0, 4) + '...)' : 'MISSING'}`);
    console.log(`  - Access Token: ${accessToken ? 'Configured (starts with ' + accessToken.substring(0, 10) + '...)' : 'MISSING'}`);

    if (!accessToken || !pageId) {
        console.error('❌ FAIL: Missing Access Token or Page ID.');
        await app.close();
        process.exit(1);
    }

    // Generate appsecret_proof for User Access Token
    let userAppsecretProof = '';
    if (appSecret) {
        userAppsecretProof = crypto
            .createHmac('sha256', appSecret)
            .update(accessToken)
            .digest('hex');
    }

    // 3. Test Graph API Page access
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
    } catch (e: any) {
        console.error(`❌ FAIL: Could not reach Facebook Page API: ${e.message}`);
    }

    // 4. Check Webhook Subscriptions
    console.log('\n🌐 2. Fetching current Webhook Subscriptions for this Page...');
    let pageAccessToken = accessToken;
    try {
        // Exchange User Access Token for Page Access Token if possible
        const accountsUrl = `https://graph.facebook.com/v21.0/me/accounts?access_token=${accessToken}` +
            (userAppsecretProof ? `&appsecret_proof=${userAppsecretProof}` : '');
        const accountsRes = await fetch(accountsUrl);
        if (accountsRes.ok) {
            const accountsData = await accountsRes.json();
            const pageAccount = accountsData.data?.find((acc: any) => String(acc.id) === String(pageId));
            if (pageAccount && pageAccount.access_token) {
                pageAccessToken = pageAccount.access_token;
                console.log(`✅ SUCCESS: Retrieved Page Access Token for Page ID ${pageId}`);
            } else {
                console.log(`⚠️ WARNING: Selected Page ID was not found in the managed accounts of this user token.`);
            }
        }
    } catch (e: any) {
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
            const isSubscribedToLeadgen = subData.data.some((appItem: any) => 
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
    } catch (e: any) {
        console.error(`❌ FAIL: Failed to query subscribed apps: ${e.message}`);
    }

    // 5. Test Webhook Callback URL verification
    console.log('\n🖥️ 3. Testing Local Webhook Callback Endpoint (Verification)...');
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
    } catch (e: any) {
        console.log(`⚠️ Note: Local server is not running on port 3000 (${e.message}). Skipping local webhook test.`);
    }

    await app.close();
    console.log('\n🏁 Diagnostics complete.');
}

diagnose().catch(err => {
    console.error('Fatal diagnostics error:', err);
    process.exit(1);
});
