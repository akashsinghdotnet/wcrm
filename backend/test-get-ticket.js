const http = require('http');

async function test() {
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@example.cc', password: 'password' })
    });
    const loginData = await loginRes.json();
    const token = loginData.access_token;

    const res = await fetch('http://localhost:3000/api/tickets/eba90b0d-bf84-49e6-8032-ce04a727396a', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    console.log(JSON.stringify(data.replies, null, 2));
}
test();
