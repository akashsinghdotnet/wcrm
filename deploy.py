import pexpect
import sys

child = pexpect.spawn('ssh -o StrictHostKeyChecking=no magnetcrmak@104.223.38.95')

child.expect('password:')
child.sendline('T80XjfOttGImBB2gKz97')

child.expect(r'\$ ')
child.sendline('cd /home/magnetcrmak/htdocs/api.magnetcrm.com')

child.expect(r'\$ ')
child.sendline('git reset --hard')

child.expect(r'\$ ')
child.sendline('git pull origin main')

child.expect(r'\$ ')
child.sendline('export PATH="/home/magnetcrmak/.nvm/versions/node/v18.20.8/bin:$PATH"')

child.expect(r'\$ ')
child.sendline('cd backend && npm install && npm run build && cd ..')

child.expect(r'\$ ')
child.sendline('cd frontend && npm install && npm run build')

child.expect(r'\$ ')
child.sendline('rm -rf /home/magnetcrmak/htdocs/app.magnetcrm.com/*')

child.expect(r'\$ ')
child.sendline('cp -r dist/* /home/magnetcrmak/htdocs/app.magnetcrm.com/ && cd ..')

child.expect(r'\$ ')
child.sendline('pm2 restart magnet-backend || pm2 start dist/main.js --name "magnet-backend"')

child.expect(r'\$ ')
child.sendline('exit')

print("Deployment commands sent successfully")
