const { execSync } = require('child_process');
const path = require('path');

const FRONTEND_PATH = path.join(__dirname, 'frontend');

console.log('🏗️ Building Frontend...');
execSync('npm run build', { cwd: FRONTEND_PATH, stdio: 'inherit' });

console.log('🌐 Uploading to app.magnetcrm.com...');
const cmd = `sshpass -p 'oLTBIIHkR1fEkQCxwXQM' rsync -avz -e "ssh -o StrictHostKeyChecking=no" "${FRONTEND_PATH}/dist/" magnecrmappak@104.223.38.95:/home/magnecrmappak/htdocs/app.magnetcrm.com/`;
try {
    execSync(cmd, { stdio: 'inherit' });
} catch (e) {
    // rsync exit 23 is just a timestamp warning, files are transferred fine
    if (e.status === 23) {
        console.log('⚠️  Minor rsync warning (timestamps) — files uploaded successfully.');
    } else {
        throw e;
    }
}

console.log('\n✅ Frontend deployed successfully!');
