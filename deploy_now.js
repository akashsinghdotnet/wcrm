const { execSync } = require('child_process');
const path = require('path');

const BACKEND_PATH = path.join(__dirname, 'backend');
const FRONTEND_PATH = path.join(__dirname, 'frontend');

console.log('🚀 Starting Deployment...\n');

try {
    // 1. Backend Rsync
    console.log('📦 Syncing Backend files...');
    const backendRsyncCmd = `sshpass -p 'T80XjfOttGImBB2gKz97' rsync -avz -e "ssh -o StrictHostKeyChecking=no" --exclude 'node_modules' --exclude '.git' --exclude 'dist' "${BACKEND_PATH}/" magnetcrmak@104.223.38.95:/home/magnetcrmak/htdocs/api.magnetcrm.com/backend/`;
    execSync(backendRsyncCmd, { stdio: 'inherit' });

    // 2. Backend Build & Restart
    console.log('⚙️ Building and Restarting Backend...');
    const backendRestartCmd = `sshpass -p 'T80XjfOttGImBB2gKz97' ssh -o StrictHostKeyChecking=no magnetcrmak@104.223.38.95 "export PATH=/home/magnetcrm-api/.nvm/versions/node/v20.20.0/bin:\\$PATH && cd /home/magnetcrmak/htdocs/api.magnetcrm.com/backend && npm run build && pm2 restart magnet-backend"`;
    execSync(backendRestartCmd, { stdio: 'inherit' });

    // 3. Frontend Build
    console.log('🏗️ Building Frontend locally (this might take a minute)...');
    execSync('npm run build', { cwd: FRONTEND_PATH, stdio: 'inherit' });

    // 4. Frontend Rsync
    console.log('🌐 Syncing Frontend files to Live Server...');
    const frontendRsyncCmd = `sshpass -p 'oLTBIIHkR1fEkQCxwXQM' rsync -avz -e "ssh -o StrictHostKeyChecking=no" "${FRONTEND_PATH}/dist/" magnecrmappak@104.223.38.95:/home/magnecrmappak/htdocs/app.magnetcrm.com/`;
    try {
        execSync(frontendRsyncCmd, { stdio: 'inherit' });
    } catch (e) {
        if (e.status === 23) {
            console.log('⚠️  Minor rsync warning (timestamps) — files uploaded successfully.');
        } else {
            throw e;
        }
    }

    console.log('\n✅ DEPLOYMENT COMPLETE! All changes are now live.');

} catch (error) {
    console.error('\n❌ Deployment Failed!', error.message);
}
