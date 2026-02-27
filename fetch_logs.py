import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('104.223.38.95', username='magnetcrmak', password='T80XjfOttGImBB2gKz97')
stdin, stdout, stderr = ssh.exec_command('tail -n 200 /home/magnetcrmak/.pm2/logs/magnet-backend-error.log /home/magnetcrmak/.pm2/logs/magnet-backend-out.log')
print("STDOUT:")
print(stdout.read().decode())
print("STDERR:")
print(stderr.read().decode())
