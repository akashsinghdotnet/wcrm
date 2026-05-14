const { execSync } = require('child_process');

console.log('📡 Fetching Backend Logs from Live Server...\n');
try {
    const logCmd = `sshpass -p 'T80XjfOttGImBB2gKz97' ssh -o StrictHostKeyChecking=no magnetcrmak@104.223.38.95 "export PATH=/home/magnetcrm-api/.nvm/versions/node/v20.20.0/bin:\\$PATH && pm2 logs magnet-backend --lines 100 --nostream"`;
    execSync(logCmd, { stdio: 'inherit' });
} catch (error) {
    console.error('\n❌ Failed to fetch logs!', error.message);
}
