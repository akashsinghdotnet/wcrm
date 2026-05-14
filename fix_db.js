const { execSync } = require('child_process');

console.log('📡 Fixing MySQL Database Row Format on Live Server...\n');

const remoteScript = `
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '/home/magnetcrmak/htdocs/api.magnetcrm.com/.env' });

async function fix() {
  try {
      const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
      });
      console.log('Connected to DB');
      
      const tables = ['whatsapp_contacts', 'plans', 'companies', 'users', 'leads', 'whatsapp_messages'];
      for (const table of tables) {
         try {
             await connection.query(\`ALTER TABLE \${table} ROW_FORMAT=DYNAMIC\`);
             console.log(\`✅ Fixed ROW_FORMAT for \${table}\`);
         } catch(e) {
             console.log(\`⚠️ Could not alter \${table}: \${e.message}\`);
         }
      }
      process.exit(0);
  } catch (err) {
      console.error(err);
      process.exit(1);
  }
}
fix();
`;

const fs = require('fs');
fs.writeFileSync('remote_fix.js', remoteScript);

try {
    // Copy the script to the server
    execSync(`sshpass -p 'T80XjfOttGImBB2gKz97' scp -o StrictHostKeyChecking=no remote_fix.js magnetcrmak@104.223.38.95:/home/magnetcrmak/htdocs/api.magnetcrm.com/backend/remote_fix.js`);
    
    // Run the script on the server
    const runCmd = `sshpass -p 'T80XjfOttGImBB2gKz97' ssh -o StrictHostKeyChecking=no magnetcrmak@104.223.38.95 "export PATH=/home/magnetcrm-api/.nvm/versions/node/v20.20.0/bin:\\$PATH && cd /home/magnetcrmak/htdocs/api.magnetcrm.com/backend && node remote_fix.js"`;
    
    execSync(runCmd, { stdio: 'inherit' });
    console.log('\\n✅ Database fixed successfully! Restarting backend...');
    
    // Restart the backend to apply changes
    execSync(`sshpass -p 'T80XjfOttGImBB2gKz97' ssh -o StrictHostKeyChecking=no magnetcrmak@104.223.38.95 "export PATH=/home/magnetcrm-api/.nvm/versions/node/v20.20.0/bin:\\$PATH && pm2 restart magnet-backend"`, { stdio: 'inherit' });
    
} catch (error) {
    console.error('\n❌ Failed to fix DB!', error.message);
}
