const { Client } = require('ssh2');

async function deploy(host, username, password, cwd, preCmd, buildCmd, pm2Restart) {
    return new Promise((resolve, reject) => {
        const conn = new Client();
        conn.on('ready', () => {
            console.log(`[${host}] SSH Connected... Running deployment`);
            const command = `cd ${cwd} && git pull origin main && ${preCmd} && ${buildCmd} && ${pm2Restart}`;
            console.log(`[${host}] Executing: ${command}`);
            conn.exec(command, (err, stream) => {
                if (err) return reject(err);
                stream.on('close', (code, signal) => {
                    console.log(`[${host}] Process closed with code ${code}`);
                    conn.end();
                    resolve();
                }).on('data', (data) => {
                    console.log(`[${host}] STDOUT: ${data}`);
                }).stderr.on('data', (data) => {
                    console.log(`[${host}] STDERR: ${data}`);
                });
            });
        }).on('error', (err) => {
            reject(err);
        }).connect({
            host: host,
            port: 22,
            username: username,
            password: password
        });
    });
}

async function run() {
    try {
        console.log("Starting backend deployment...");
        await deploy(
            '104.223.38.95',
            'magnetcrmak',
            'T80XjfOttGImBB2gKz97',
            '/home/magnetcrm-api/htdocs/api.magnetcrm.com',
            'export NVM_DIR="/home/magnetcrm-api/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh" && nvm use 20',
            'cd backend && npm install && npm run build',
            'pm2 reload all'
        );
        
        console.log("Starting frontend deployment...");
        await deploy(
            '104.223.38.95', // Same box, different user
            'magnecrmappak',
            'oLTBIIHkR1fEkQCxwXQM',
            '/home/magnecrm-app/htdocs/app.magnetcrm.com',
            'export NVM_DIR="/home/magnecrm-app/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh" && nvm use 20',
            'cd frontend && npm install && npm run build',
            'pm2 reload all' // Actually frontend doesn't need pm2 restart if it's static, but just in case it's SSR or they run it via pm2
        );
        
        console.log("Deployment fully completed!");
    } catch (e) {
        console.error("Deployment failed:", e);
    }
}
run();
