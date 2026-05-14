async function run() {
    console.log("1. Logging in...");
    let res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'companyadmin@magnetcrm.com', password: 'password123' })
    });
    let data = await res.json();
    const token = data.access_token;
    if (!token) { console.error("Login failed!", data); return; }

    console.log("2. Checking Dashboard Admin Stats...");
    res = await fetch('http://localhost:3000/api/dashboard/admin', {
        headers: { Authorization: `Bearer ${token}` }
    });
    data = await res.json();
    console.log("Dashboard response keys:", Object.keys(data));
    console.log("eventStats:", data.eventStats);

    console.log("3. Creating Event with 0 capacity...");
    res = await fetch('http://localhost:3000/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
            title: 'Test Event ' + Date.now(),
            status: 'published',
            isPublic: true,
            capacity: 0
        })
    });
    const event = await res.json();
    console.log("Created Event:", event.id);

    console.log("4. Checking Ticket Types for Event...");
    res = await fetch(`http://localhost:3000/api/events/${event.id}/ticket-types`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const tts = await res.json();
    console.log("Ticket Types:", tts);

    if (tts.length > 0) {
        console.log("5. Initiating Booking...");
        res = await fetch(`http://localhost:3000/api/public/events/${event.slug}/book`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ticketTypeId: tts[0].id,
                quantity: 1,
                firstName: 'John',
                lastName: 'Doe',
                guestEmail: 'john@example.com',
                paymentMethod: 'free'
            })
        });
        const booking = await res.json();
        console.log("Booking result:", booking);
    }
}
run();
