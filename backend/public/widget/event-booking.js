/**
 * MagnetCRM Event Booking Widget
 * Usage: <script src="https://api.magnetcrm.com/widget/event-booking.js" data-slug="your-event-slug"></script>
 */
(function () {
    const script = document.currentScript;
    if (!script) return;

    const eventSlug = script.getAttribute('data-slug');
    if (!eventSlug) {
        console.error('[MagnetCRM] data-slug attribute is required for event booking widget.');
        return;
    }

    // Determine the base URL (handles local dev vs production)
    const scriptUrl = new URL(script.src);
    // In production, the frontend is usually on a different subdomain or port (e.g. localhost:5173 for dev)
    // We will hardcode or guess the frontend URL based on the API URL.
    // Assuming api is on api.magnetcrm.com and frontend is on app.magnetcrm.com
    // For local development, if scriptUrl port is 3000, frontend is 5173.
    let frontendBase = 'https://app.magnetcrm.com';
    if (scriptUrl.hostname === 'localhost' || scriptUrl.hostname === '127.0.0.1') {
        frontendBase = 'http://localhost:5173';
    } else if (scriptUrl.hostname.includes('api.')) {
        frontendBase = scriptUrl.origin.replace('api.', 'app.');
    } else {
        // Fallback or generic rule for production
        frontendBase = scriptUrl.origin;
    }

    const themeColor = script.getAttribute('data-theme-color');
    const bgColor = script.getAttribute('data-bg-color');
    const font = script.getAttribute('data-font');

    let iframeUrl = `${frontendBase}/event/${eventSlug}?embed=true`;
    if (themeColor) iframeUrl += `&themeColor=${encodeURIComponent(themeColor)}`;
    if (bgColor) iframeUrl += `&bgColor=${encodeURIComponent(bgColor)}`;
    if (font) iframeUrl += `&font=${encodeURIComponent(font)}`;

    const iframe = document.createElement('iframe');
    iframe.src = iframeUrl;
    iframe.style.width = '100%';
    iframe.style.height = '800px'; // default height
    iframe.style.border = 'none';
    iframe.style.overflow = 'hidden';
    iframe.style.borderRadius = '16px';
    iframe.style.boxShadow = '0 4px 20px rgba(0,0,0,0.05)';

    // Listen for resize messages from the iframe to adjust height dynamically
    window.addEventListener('message', (event) => {
        if (event.origin !== frontendBase) return;
        if (event.data && event.data.type === 'MCRM_RESIZE' && event.data.slug === eventSlug) {
            iframe.style.height = `${event.data.height}px`;
        }
    });

    script.parentNode.insertBefore(iframe, script);
})();
