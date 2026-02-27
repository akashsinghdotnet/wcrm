const http = require('http');

async function test() {
    // Login as company admin
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@example.cc', password: 'password' })
    });
    const loginData = await loginRes.json();
    console.log('Login:', loginData);

    const token = loginData.access_token;

    // Post reply
    const replyRes = await fetch('http://localhost:3000/api/tickets/eba90b0d-bf84-49e6-8032-ce04a727396a/reply', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: "Test error log script" })
    });

    const replyData = await replyRes.json();
    console.log('Reply API Status:', replyRes.status);
    console.log('Reply API Error Body:', replyData);
}

test();
