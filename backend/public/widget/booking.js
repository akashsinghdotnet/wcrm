/**
 * MagnetCRM Booking Widget
 * Usage: <script src="https://api.magnetcrm.com/widget/booking.js" data-slug="your-company" data-meeting="discovery"></script>
 * Optional: data-mode="inline" (embeds directly) or data-mode="popup" (button that opens modal, default)
 * Optional: data-button-text="Book Now"
 */
(function () {
    const API_BASE = 'https://api.magnetcrm.com/api';
    const script = document.currentScript;
    const bookingSlug = script.getAttribute('data-slug');
    const meetingSlug = script.getAttribute('data-meeting');
    const mode = script.getAttribute('data-mode') || 'popup';
    const buttonText = script.getAttribute('data-button-text') || 'Book Appointment';

    if (!bookingSlug || !meetingSlug) {
        console.error('[MagnetCRM] data-slug and data-meeting attributes are required.');
        return;
    }

    // State
    let company = null, meetingType = null, design = {}, settings = {};
    let selectedDate = new Date().toISOString().split('T')[0];
    let slots = [], selectedSlot = null, step = 'calendar';
    let container = null;

    // Fetch data
    async function fetchJSON(url) {
        const res = await fetch(url);
        if (!res.ok) throw new Error('API error');
        return res.json();
    }

    async function init() {
        try {
            const data = await fetchJSON(`${API_BASE}/public/booking/${bookingSlug}/${meetingSlug}`);
            company = data.company;
            meetingType = data.meetingType;
            settings = data.settings || {};
            design = {
                brand: settings.brandColor || '#4f46e5',
                bg: settings.bgColor || '#ffffff',
                text: settings.textColor || '#111827',
                btnText: settings.buttonTextColor || '#ffffff',
                radius: (settings.borderRadius || '12') + 'px'
            };

            if (mode === 'inline') {
                container = document.createElement('div');
                script.parentNode.insertBefore(container, script);
                renderWidget();
            } else {
                renderPopupButton();
            }
        } catch (e) {
            console.error('[MagnetCRM] Failed to load booking data:', e);
        }
    }

    async function loadSlots(date) {
        selectedDate = date;
        selectedSlot = null;
        step = 'calendar';
        try {
            const data = await fetchJSON(`${API_BASE}/public/booking/${bookingSlug}/${meetingSlug}/availability?date=${date}`);
            slots = data.availableSlots || [];
        } catch (e) {
            slots = [];
        }
        renderWidget();
    }

    async function submitBooking(form) {
        try {
            const res = await fetch(`${API_BASE}/public/booking/${bookingSlug}/${meetingSlug}/book`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, date: selectedDate, startTime: selectedSlot })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Booking failed');

            if (data.thankYouUrl) {
                window.location.href = data.thankYouUrl;
                return;
            }
            step = 'success';
            renderWidget();
        } catch (e) {
            alert(e.message || 'Failed to book. Please try again.');
        }
    }

    // Popup mode
    function renderPopupButton() {
        const btn = document.createElement('button');
        btn.textContent = buttonText;
        btn.style.cssText = `background:${design.brand};color:${design.btnText};padding:14px 28px;border:none;border-radius:${design.radius};font-size:16px;font-weight:700;cursor:pointer;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.15);transition:transform .15s,box-shadow .15s;`;
        btn.onmouseenter = () => { btn.style.transform = 'translateY(-2px)'; btn.style.boxShadow = '0 6px 20px rgba(0,0,0,.2)'; };
        btn.onmouseleave = () => { btn.style.transform = ''; btn.style.boxShadow = '0 4px 14px rgba(0,0,0,.15)'; };
        btn.onclick = openModal;
        script.parentNode.insertBefore(btn, script);
    }

    function openModal() {
        const overlay = document.createElement('div');
        overlay.id = 'mcrmBookingOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px);';
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

        container = document.createElement('div');
        container.style.cssText = `max-width:800px;width:100%;max-height:90vh;overflow-y:auto;border-radius:${design.radius};box-shadow:0 25px 60px rgba(0,0,0,.3);position:relative;`;

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.style.cssText = 'position:absolute;top:12px;right:12px;z-index:10;background:rgba(0,0,0,.1);border:none;width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer;color:#666;display:flex;align-items:center;justify-content:center;';
        closeBtn.onclick = () => overlay.remove();
        container.appendChild(closeBtn);

        overlay.appendChild(container);
        document.body.appendChild(overlay);
        loadSlots(selectedDate);
    }

    // Render the booking widget
    function renderWidget() {
        if (!container) return;
        const closeBtn = container.querySelector('button');
        container.innerHTML = '';
        if (closeBtn && mode === 'popup') container.appendChild(closeBtn);

        const d = design;
        const wrap = el('div', { style: `background:${d.bg};border-radius:${d.radius};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;` });

        if (step === 'success') {
            wrap.innerHTML = `
                <div style="padding:48px 32px;text-align:center;">
                    <div style="width:64px;height:64px;border-radius:50%;background:#d1fae5;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <h2 style="color:${d.text};font-size:22px;font-weight:700;margin:0 0 8px;">Booking Confirmed!</h2>
                    <p style="color:${d.text};opacity:.6;font-size:15px;margin:0 0 24px;">${settings.confirmationMessage || 'Your appointment has been booked successfully!'}</p>
                    <div style="background:${d.brand}08;border-radius:${d.radius};padding:16px;text-align:left;">
                        <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px;"><span style="color:${d.text};opacity:.5;">Meeting</span><span style="color:${d.text};font-weight:600;">${meetingType.title}</span></div>
                        <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px;"><span style="color:${d.text};opacity:.5;">Date</span><span style="color:${d.text};font-weight:600;">${new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })}</span></div>
                        <div style="display:flex;justify-content:space-between;font-size:14px;"><span style="color:${d.text};opacity:.5;">Time</span><span style="color:${d.text};font-weight:600;">${selectedSlot}</span></div>
                    </div>
                </div>
            `;
            container.appendChild(wrap);
            return;
        }

        if (step === 'form') {
            wrap.innerHTML = `
                <div style="padding:32px;">
                    <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid ${d.brand}15;">
                        <button id="mcrmBack" style="background:none;border:none;font-size:20px;cursor:pointer;color:${d.text};padding:4px;">←</button>
                        <div>
                            <h3 style="margin:0;font-size:18px;font-weight:700;color:${d.text};">Enter Your Details</h3>
                            <p style="margin:4px 0 0;font-size:14px;color:${d.brand};font-weight:600;">${new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })} @ ${selectedSlot}</p>
                        </div>
                    </div>
                    <form id="mcrmForm" style="display:flex;flex-direction:column;gap:16px;">
                        <div>
                            <label style="display:block;font-size:13px;font-weight:600;color:${d.text};opacity:.7;margin-bottom:6px;">Name *</label>
                            <input name="guestName" required placeholder="John Doe" style="width:100%;padding:12px 16px;border:1.5px solid ${d.brand}30;border-radius:${d.radius};font-size:15px;color:${d.text};background:${d.bg};box-sizing:border-box;outline:none;" onfocus="this.style.borderColor='${d.brand}'" onblur="this.style.borderColor='${d.brand}30'" />
                        </div>
                        <div>
                            <label style="display:block;font-size:13px;font-weight:600;color:${d.text};opacity:.7;margin-bottom:6px;">Email *</label>
                            <input name="guestEmail" type="email" required placeholder="john@example.com" style="width:100%;padding:12px 16px;border:1.5px solid ${d.brand}30;border-radius:${d.radius};font-size:15px;color:${d.text};background:${d.bg};box-sizing:border-box;outline:none;" onfocus="this.style.borderColor='${d.brand}'" onblur="this.style.borderColor='${d.brand}30'" />
                        </div>
                        <div>
                            <label style="display:block;font-size:13px;font-weight:600;color:${d.text};opacity:.7;margin-bottom:6px;">Notes (Optional)</label>
                            <textarea name="guestNotes" rows="3" placeholder="Anything you'd like us to know..." style="width:100%;padding:12px 16px;border:1.5px solid ${d.brand}30;border-radius:${d.radius};font-size:15px;color:${d.text};background:${d.bg};box-sizing:border-box;resize:none;outline:none;font-family:inherit;" onfocus="this.style.borderColor='${d.brand}'" onblur="this.style.borderColor='${d.brand}30'"></textarea>
                        </div>
                        <button type="submit" style="width:100%;padding:14px;background:${d.brand};color:${d.btnText};border:none;border-radius:${d.radius};font-size:16px;font-weight:700;cursor:pointer;">Schedule Event</button>
                    </form>
                </div>
            `;
            container.appendChild(wrap);
            container.querySelector('#mcrmBack').onclick = () => { step = 'calendar'; renderWidget(); };
            container.querySelector('#mcrmForm').onsubmit = (e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                submitBooking({ guestName: fd.get('guestName'), guestEmail: fd.get('guestEmail'), guestNotes: fd.get('guestNotes') });
            };
            return;
        }

        // Calendar step
        const slotsHtml = slots.length === 0
            ? `<div style="text-align:center;padding:24px;color:${d.text};opacity:.5;font-size:14px;">No slots available on this date.</div>`
            : slots.map(s => `<button class="mcrmSlot" data-time="${s}" style="width:100%;padding:12px;border:1.5px solid ${d.brand}30;background:transparent;color:${d.brand};font-weight:600;font-size:14px;border-radius:${d.radius};cursor:pointer;transition:all .15s;text-align:center;" onmouseenter="this.style.background='${d.brand}';this.style.color='${d.btnText}'" onmouseleave="this.style.background='transparent';this.style.color='${d.brand}'">${s}</button>`).join('');

        wrap.innerHTML = `
            <div style="display:flex;flex-direction:column;">
                <div style="padding:24px 32px;border-bottom:1px solid ${d.brand}10;">
                    <p style="margin:0 0 4px;font-size:13px;text-transform:uppercase;letter-spacing:1px;color:${d.text};opacity:.4;font-weight:700;">${company?.companyName || ''}</p>
                    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${d.text};">${meetingType.title}</h2>
                    <p style="margin:0;font-size:14px;color:${d.text};opacity:.6;">⏱ ${meetingType.duration} minutes</p>
                    ${meetingType.description ? `<p style="margin:12px 0 0;font-size:14px;color:${d.text};opacity:.55;">${meetingType.description}</p>` : ''}
                </div>
                <div style="padding:24px 32px;display:flex;gap:24px;flex-wrap:wrap;">
                    <div style="flex:1;min-width:200px;">
                        <label style="display:block;font-size:13px;font-weight:600;color:${d.text};opacity:.7;margin-bottom:8px;">Select Date</label>
                        <input type="date" id="mcrmDate" value="${selectedDate}" min="${new Date().toISOString().split('T')[0]}" style="width:100%;padding:12px 16px;border:1.5px solid ${d.brand}30;border-radius:${d.radius};font-size:15px;color:${d.text};background:${d.bg};box-sizing:border-box;outline:none;" />
                    </div>
                    <div style="flex:1;min-width:200px;">
                        <label style="display:block;font-size:13px;font-weight:600;color:${d.text};opacity:.7;margin-bottom:8px;">Available Times</label>
                        <div style="display:flex;flex-direction:column;gap:8px;max-height:280px;overflow-y:auto;">
                            ${slotsHtml}
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(wrap);

        container.querySelector('#mcrmDate').onchange = (e) => loadSlots(e.target.value);
        container.querySelectorAll('.mcrmSlot').forEach(btn => {
            btn.onclick = () => { selectedSlot = btn.dataset.time; step = 'form'; renderWidget(); };
        });

        // Initial load
        if (slots.length === 0 && step === 'calendar') loadSlots(selectedDate);
    }

    function el(tag, attrs) {
        const e = document.createElement(tag);
        if (attrs) Object.entries(attrs).forEach(([k, v]) => { if (k === 'style') e.style.cssText = v; else e.setAttribute(k, v); });
        return e;
    }

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
