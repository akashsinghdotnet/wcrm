const axios = require('axios');
async function test() {
    try {
        // Need to login first to get a token
        const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
            email: 'companyadmin@magnetcrm.com',
            password: 'password123'
        });
        const token = loginRes.data.access_token;
        console.log('Logged in. Token:', token.substring(0, 20) + '...');

        // Create an event with 0 capacity
        const createRes = await axios.post('http://localhost:3000/api/events', {
            title: 'Test Event Zero Capacity ' + Date.now(),
            description: 'Testing 0 capacity bug',
            location: 'Virtual',
            capacity: 0,
            status: 'published',
            isPublic: true
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const eventId = createRes.data.id;
        console.log('Event created with ID:', eventId);

        // Fetch ticket types for this event
        const ttRes = await axios.get(`http://localhost:3000/api/events/${eventId}/ticket-types`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Ticket types automatically created:', ttRes.data);
    } catch (e) {
        console.error('Error:', e.response ? e.response.data : e.message);
    }
}
test();
