const fs = require('fs');
const crypto = require('crypto');
const mysql = require('mysql2/promise');

async function main() {
  // 1. Read .env manually
  const envPath = '/home/magnetcrm-api/htdocs/api.magnetcrm.com/.env';
  if (!fs.existsSync(envPath)) {
    console.error('Error: .env file not found at: ' + envPath);
    return;
  }
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      env[parts[0].trim()] = parts.slice(1).join('=').replace(/[\"\\']/g, '').trim();
    }
  });

  // 2. Connect to Database (MySQL)
  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    port: parseInt(env.DB_PORT || '3306'),
    user: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  });

  try {
    const [rows] = await connection.execute("SELECT credentials FROM integration_configs WHERE companyId='57835977-69a9-40ed-988b-5ca829f113e4' AND platform='meta' LIMIT 1");
    if (rows.length === 0) {
      console.log('No Meta integration config found for company 57835977-69a9-40ed-988b-5ca829f113e4.');
      return;
    }

    let creds = rows[0].credentials;
    if (typeof creds === 'string') {
      creds = JSON.parse(creds);
    }

    const { pageId, accessToken, appSecret } = creds;
    if (!pageId || !accessToken) {
      console.log('Meta credentials found but pageId or accessToken is missing:', creds);
      return;
    }

    console.log(`Checking Facebook page: ${pageId} (${creds.pageName || 'Ajay Gangwar'})...`);

    // Calculate appsecret_proof if appSecret is provided
    let appsecretProof = '';
    if (appSecret) {
      appsecretProof = crypto
        .createHmac('sha256', appSecret)
        .update(accessToken)
        .digest('hex');
    }

    // Call Facebook API to get subscribed apps
    const url = `https://graph.facebook.com/v21.0/${pageId}/subscribed_apps?access_token=${accessToken}` +
      (appsecretProof ? `&appsecret_proof=${appsecretProof}` : '');

    const response = await fetch(url);
    const data = await response.json();

    console.log('--- Subscribed Apps response from Meta ---');
    console.log(JSON.stringify(data, null, 2));
    console.log('-----------------------------------------');

    if (data.data && data.data.some(app => app.id === '2006441490284444' || app.name?.toLowerCase().includes('magnet'))) {
      console.log('SUCCESS: Page is successfully subscribed to the CRM App!');
    } else {
      console.log('WARNING: App is not listed in subscribed apps for this page.');
    }

  } finally {
    await connection.end();
  }
}

main().catch(err => {
  console.error('Error running script:', err);
});
