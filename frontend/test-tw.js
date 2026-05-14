const { execSync } = require('child_process');

try {
  const result = execSync('npx @tailwindcss/cli -i src/index.css --content "test-tw.html" -o out.css', { encoding: 'utf8' });
  console.log("Compiled. CSS size:", require('fs').statSync('out.css').size);
  console.log(require('fs').readFileSync('out.css', 'utf8').substring(0, 500));
} catch (e) {
  console.error("Failed", e.stdout);
}
