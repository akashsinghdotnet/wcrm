process.env.NODE_PATH = '/Users/priyankasharma/Desktop/ssh2pkg/node_modules';
require('module').Module._initPaths();
const { Client } = require('ssh2');
const fs = require('fs');

function connectSSH(config) {
    return new Promise((resolve, reject) => {
        const conn = new Client();
        conn.on('ready', () => resolve(conn));
        conn.on('error', reject);
        conn.connect(config);
    });
}
function getSftp(conn) {
    return new Promise((resolve, reject) => conn.sftp((e,s) => e ? reject(e) : resolve(s)));
}
function uploadFile(sftp, local, remote) {
    return new Promise((resolve, reject) => {
        sftp.fastPut(local, remote, (err) => {
            if (err) reject(err); else { console.log('  Uploaded:', remote.split('/').pop()); resolve(); }
        });
    });
}
function execCommand(conn, cmd) {
    return new Promise((resolve, reject) => {
        conn.exec(cmd, (err, stream) => {
            if (err) return reject(err);
            let out = '', er = '';
            stream.on('data', d => out += d);
            stream.stderr.on('data', d => er += d);
            stream.on('close', (code) => {
                if (code !== 0) { console.log('ERR:', er.slice(-400)); reject(new Error('exit ' + code)); }
                else resolve(out);
            });
        });
    });
}

async function main() {
    const BASE = '/Users/priyankasharma/Desktop/Magnet CRM';

    console.log('=== Backend ===');
    const bConn = await connectSSH({ host: '104.223.38.95', username: 'magnetcrmak', password: 'T80XjfOttGImBB2gKz97', port: 22 });
    const bSftp = await getSftp(bConn);
    const BDIR = '/home/magnetcrmak/htdocs/api.magnetcrm.com/backend/src/whatsapp';
    await uploadFile(bSftp, `${BASE}/backend/src/whatsapp/whatsapp.service.ts`, `${BDIR}/whatsapp.service.ts`);
    await uploadFile(bSftp, `${BASE}/backend/src/whatsapp/whatsapp.controller.ts`, `${BDIR}/whatsapp.controller.ts`);
    await uploadFile(bSftp, `${BASE}/backend/src/whatsapp/whatsapp.module.ts`, `${BDIR}/whatsapp.module.ts`);
    await uploadFile(bSftp, `${BASE}/backend/src/whatsapp/whatsapp-web.service.ts`, `${BDIR}/whatsapp-web.service.ts`);
    await uploadFile(bSftp, `${BASE}/backend/src/whatsapp/whatsapp-web.controller.ts`, `${BDIR}/whatsapp-web.controller.ts`);
    await uploadFile(bSftp, `${BASE}/backend/src/whatsapp/whatsapp-config.entity.ts`, `${BDIR}/whatsapp-config.entity.ts`);
    await uploadFile(bSftp, `${BASE}/backend/src/whatsapp/whatsapp-message.entity.ts`, `${BDIR}/whatsapp-message.entity.ts`);
    // Appointments module
    const APPTDIR = '/home/magnetcrmak/htdocs/api.magnetcrm.com/backend/src/appointments';
    await uploadFile(bSftp, `${BASE}/backend/src/appointments/appointments.controller.ts`, `${APPTDIR}/appointments.controller.ts`);
    await uploadFile(bSftp, `${BASE}/backend/src/appointments/appointments.service.ts`, `${APPTDIR}/appointments.service.ts`);
    
    // Hotels module
    await execCommand(bConn, 'mkdir -p /home/magnetcrmak/htdocs/api.magnetcrm.com/backend/src/hotels/entities');
    const HOTELSDIR = '/home/magnetcrmak/htdocs/api.magnetcrm.com/backend/src/hotels';
    await uploadFile(bSftp, `${BASE}/backend/src/hotels/hotels.controller.ts`, `${HOTELSDIR}/hotels.controller.ts`);
    await uploadFile(bSftp, `${BASE}/backend/src/hotels/hotels.service.ts`, `${HOTELSDIR}/hotels.service.ts`);
    await uploadFile(bSftp, `${BASE}/backend/src/hotels/hotels.module.ts`, `${HOTELSDIR}/hotels.module.ts`);
    await uploadFile(bSftp, `${BASE}/backend/src/hotels/public-hotels.controller.ts`, `${HOTELSDIR}/public-hotels.controller.ts`);
    await uploadFile(bSftp, `${BASE}/backend/src/hotels/entities/hotel.entity.ts`, `${HOTELSDIR}/entities/hotel.entity.ts`);
    await uploadFile(bSftp, `${BASE}/backend/src/hotels/entities/room-type.entity.ts`, `${HOTELSDIR}/entities/room-type.entity.ts`);
    await uploadFile(bSftp, `${BASE}/backend/src/hotels/entities/hotel-booking.entity.ts`, `${HOTELSDIR}/entities/hotel-booking.entity.ts`);
    await uploadFile(bSftp, `${BASE}/backend/src/app.module.ts`, `/home/magnetcrmak/htdocs/api.magnetcrm.com/backend/src/app.module.ts`);
    await uploadFile(bSftp, `${BASE}/backend/public/widget/hotel-booking.js`, `/home/magnetcrmak/htdocs/api.magnetcrm.com/backend/public/widget/hotel-booking.js`);

    await uploadFile(bSftp, `${BASE}/backend/package.json`, '/home/magnetcrmak/htdocs/api.magnetcrm.com/backend/package.json');
    bSftp.end();
    console.log('  Installing Backend Packages...');
    const npmOut = await execCommand(bConn, 'export PATH=/home/magnetcrm-api/.nvm/versions/node/v20.20.0/bin:$PATH && export PUPPETEER_SKIP_DOWNLOAD=true && cd /home/magnetcrmak/htdocs/api.magnetcrm.com/backend && npm install 2>&1 | tail -5');
    console.log(npmOut.trim());
    console.log('  Building...');
    const bOut = await execCommand(bConn, 'export PATH=/home/magnetcrm-api/.nvm/versions/node/v20.20.0/bin:$PATH && cd /home/magnetcrmak/htdocs/api.magnetcrm.com/backend && npm run build 2>&1 | tail -5');
    console.log(bOut.trim());
    await execCommand(bConn, 'export PATH=/home/magnetcrm-api/.nvm/versions/node/v20.20.0/bin:$PATH && cd /home/magnetcrmak/htdocs/api.magnetcrm.com && npx pm2 restart magnet-backend');
    bConn.end();
    console.log('  Backend done!');

    console.log('=== Frontend ===');
    const fConn = await connectSSH({ host: '104.223.38.95', username: 'magnecrmappak', password: 'oLTBIIHkR1fEkQCxwXQM', port: 22 });
    const fSftp = await getSftp(fConn);
    await uploadFile(fSftp, `${BASE}/dist.tar.gz`, '/home/magnecrmappak/htdocs/app.magnetcrm.com/dist.tar.gz');
    fSftp.end();
    await execCommand(fConn, 'cd /home/magnecrmappak/htdocs/app.magnetcrm.com && rm -rf assets *.html vite.svg && tar -xzf dist.tar.gz && rm -f dist.tar.gz; true');
    fConn.end();
    console.log('  Frontend done!');

    console.log('\n✅ Deployment complete!');
}
main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
