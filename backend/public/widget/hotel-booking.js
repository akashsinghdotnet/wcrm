/**
 * MagnetCRM Hotel Booking Widget
 * Usage: <script src="https://api.magnetcrm.com/widget/hotel-booking.js" data-slug="your-hotel-slug"></script>
 * Optional: data-mode="inline" (embeds directly) or data-mode="popup" (button that opens modal, default)
 * Optional: data-button-text="Book a Room"
 */
(function () {
    const API_BASE = 'https://api.magnetcrm.com/api';
    const script = document.currentScript;
    const hotelSlug = script.getAttribute('data-slug');
    const mode = script.getAttribute('data-mode') || 'popup';
    const buttonText = script.getAttribute('data-button-text') || 'Book a Room';

    if (!hotelSlug) {
        console.error('[MagnetCRM] data-slug attribute is required.');
        return;
    }

    // State
    let hotel = null, roomTypes = [];
    let step = 'select-room'; // select-room, select-dates, form, success
    let selectedRoom = null;
    let dates = { checkIn: '', checkOut: '' };
    let guests = 1;
    let availability = null;
    let confirmationCode = '';
    
    // Design
    let design = { brand: '#4f46e5', bg: '#ffffff', text: '#111827', btnText: '#ffffff', radius: '12px' };
    let container = null;

    async function fetchJSON(url, options = {}) {
        const res = await fetch(url, options);
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.message || 'API error');
        }
        return res.json();
    }

    async function init() {
        try {
            const data = await fetchJSON(`${API_BASE}/public/hotels/${hotelSlug}`);
            hotel = data.hotel;
            roomTypes = data.roomTypes;
            
            if (hotel.brandColor) design.brand = hotel.brandColor;

            if (mode === 'inline') {
                container = document.createElement('div');
                script.parentNode.insertBefore(container, script);
                renderWidget();
            } else {
                renderPopupButton();
            }
        } catch (e) {
            console.error('[MagnetCRM] Failed to load hotel data:', e);
        }
    }

    async function checkAvailability(e) {
        e.preventDefault();
        if (!dates.checkIn || !dates.checkOut) return alert('Please select dates');
        if (new Date(dates.checkIn) >= new Date(dates.checkOut)) return alert('Check-out must be after check-in');
        
        try {
            const btn = container.querySelector('#mcrmCheckBtn');
            const originalText = btn.textContent;
            btn.textContent = 'Checking...';
            btn.disabled = true;

            const res = await fetchJSON(`${API_BASE}/public/hotels/${hotelSlug}/availability?roomTypeId=${selectedRoom.id}&checkIn=${dates.checkIn}&checkOut=${dates.checkOut}`);
            
            if (!res.available) {
                alert('No rooms available for the selected dates. Please try different dates.');
                btn.textContent = originalText;
                btn.disabled = false;
                return;
            }
            
            availability = res;
            step = 'form';
            renderWidget();
        } catch (e) {
            alert('Failed to check availability.');
        }
    }

    async function submitBooking(e) {
        e.preventDefault();
        try {
            const fd = new FormData(e.target);
            const payload = {
                roomTypeId: selectedRoom.id,
                checkIn: dates.checkIn,
                checkOut: dates.checkOut,
                guests: parseInt(guests),
                guestName: fd.get('guestName'),
                guestEmail: fd.get('guestEmail'),
                guestPhone: fd.get('guestPhone'),
                guestNotes: fd.get('guestNotes')
            };

            const btn = e.target.querySelector('button[type="submit"]');
            btn.textContent = 'Confirming...';
            btn.disabled = true;

            const res = await fetchJSON(`${API_BASE}/public/hotels/${hotelSlug}/book`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            confirmationCode = res.confirmationCode;
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
        container.style.cssText = `max-width:500px;width:100%;max-height:90vh;overflow-y:auto;border-radius:${design.radius};box-shadow:0 25px 60px rgba(0,0,0,.3);position:relative;background:${design.bg};`;

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.style.cssText = 'position:absolute;top:12px;right:12px;z-index:10;background:rgba(0,0,0,.05);border:none;width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer;color:#666;display:flex;align-items:center;justify-content:center;';
        closeBtn.onclick = () => overlay.remove();
        container.appendChild(closeBtn);

        overlay.appendChild(container);
        document.body.appendChild(overlay);
        
        step = 'select-room';
        renderWidget();
    }

    function renderWidget() {
        if (!container) return;
        
        // Save close button if it exists (popup mode)
        let closeBtn = null;
        if (mode === 'popup' && container.children.length > 0) {
            closeBtn = container.children[0];
        }
        
        container.innerHTML = '';
        if (closeBtn) container.appendChild(closeBtn);

        const d = design;
        const wrap = el('div', { style: `background:${d.bg};border-radius:${d.radius};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${d.text};` });

        // HEADER (Always shown unless success)
        if (step !== 'success') {
            const header = el('div', { style: `padding:24px 32px;border-bottom:1px solid ${d.brand}15;` });
            
            let backHtml = '';
            if (step !== 'select-room') {
                backHtml = `<button id="mcrmBack" style="background:none;border:none;font-size:18px;cursor:pointer;color:${d.text};padding:0 8px 0 0;margin-right:8px;font-weight:bold;">←</button>`;
            }
            
            header.innerHTML = `
                <div style="display:flex;align-items:center;">
                    ${backHtml}
                    <div>
                        <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:1px;opacity:.5;font-weight:700;">${hotel.name}</p>
                        <h2 style="margin:0;font-size:20px;font-weight:700;">
                            ${step === 'select-room' ? 'Select a Room' : step === 'select-dates' ? 'Check Availability' : 'Guest Details'}
                        </h2>
                    </div>
                </div>
            `;
            wrap.appendChild(header);
        }

        // STEP: SUCCESS
        if (step === 'success') {
            wrap.innerHTML = `
                <div style="padding:48px 32px;text-align:center;">
                    <div style="width:64px;height:64px;border-radius:50%;background:#d1fae5;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <h2 style="font-size:22px;font-weight:700;margin:0 0 8px;">Booking Confirmed!</h2>
                    <p style="opacity:.6;font-size:15px;margin:0 0 24px;">${hotel.confirmationMessage || "We've received your reservation."}</p>
                    
                    <div style="background:${d.brand}08;border-radius:${d.radius};padding:20px;text-align:left;margin-bottom:24px;">
                        <div style="margin-bottom:16px;">
                            <span style="display:block;opacity:.6;font-size:13px;margin-bottom:2px;">Confirmation Code</span>
                            <span style="font-size:20px;font-weight:700;letter-spacing:1px;color:${d.brand};">${confirmationCode}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px;"><span style="opacity:.6;">Room</span><span style="font-weight:600;">${selectedRoom.name}</span></div>
                        <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px;"><span style="opacity:.6;">Dates</span><span style="font-weight:600;">${dates.checkIn} to ${dates.checkOut}</span></div>
                    </div>
                    
                    ${mode === 'popup' ? `<button id="mcrmCloseFinal" style="width:100%;padding:14px;background:${d.brand};color:${d.btnText};border:none;border-radius:${d.radius};font-size:16px;font-weight:700;cursor:pointer;">Close</button>` : ''}
                </div>
            `;
            container.appendChild(wrap);
            if (mode === 'popup') {
                container.querySelector('#mcrmCloseFinal').onclick = () => document.getElementById('mcrmBookingOverlay').remove();
            }
            return;
        }

        const bodyWrap = el('div', { style: 'padding:24px 32px;' });

        // STEP: SELECT ROOM
        if (step === 'select-room') {
            const roomList = roomTypes.map(rt => `
                <div style="border:1.5px solid ${d.brand}30;border-radius:${d.radius};padding:16px;margin-bottom:16px;transition:border-color 0.2s;">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
                        <h3 style="margin:0;font-size:16px;font-weight:700;">${rt.name}</h3>
                        <div style="text-align:right;">
                            <div style="font-weight:700;color:${d.brand};">₹${Number(rt.pricePerNight).toLocaleString('en-IN')}</div>
                            <div style="font-size:11px;opacity:0.5;">per night</div>
                        </div>
                    </div>
                    <p style="margin:0 0 12px;font-size:13px;opacity:0.7;">Up to ${rt.capacity} Guests</p>
                    <button class="mcrmSelectRoom" data-id="${rt.id}" style="width:100%;padding:10px;background:transparent;border:1.5px solid ${d.brand};color:${d.brand};border-radius:8px;font-weight:600;cursor:pointer;font-size:14px;" onmouseover="this.style.background='${d.brand}';this.style.color='${d.btnText}'" onmouseout="this.style.background='transparent';this.style.color='${d.brand}'">Select</button>
                </div>
            `).join('');

            bodyWrap.innerHTML = roomList || `<p style="text-align:center;opacity:0.5;padding:20px;">No rooms available.</p>`;
            
            setTimeout(() => {
                const btns = container.querySelectorAll('.mcrmSelectRoom');
                btns.forEach(btn => {
                    btn.onclick = () => {
                        selectedRoom = roomTypes.find(r => r.id === btn.getAttribute('data-id'));
                        step = 'select-dates';
                        renderWidget();
                    };
                });
            }, 0);
        }

        // STEP: SELECT DATES
        if (step === 'select-dates') {
            const today = new Date().toISOString().split('T')[0];
            const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
            
            bodyWrap.innerHTML = `
                <div style="margin-bottom:24px;background:${d.brand}08;padding:12px 16px;border-radius:8px;">
                    <div style="font-size:13px;opacity:0.7;margin-bottom:4px;">Selected Room</div>
                    <div style="font-weight:600;font-size:15px;display:flex;justify-content:space-between;">
                        <span>${selectedRoom.name}</span>
                        <span>₹${Number(selectedRoom.pricePerNight).toLocaleString('en-IN')}/night</span>
                    </div>
                </div>
                
                <form id="mcrmDateForm" style="display:flex;flex-direction:column;gap:16px;">
                    <div style="display:flex;gap:16px;">
                        <div style="flex:1;">
                            <label style="display:block;font-size:12px;font-weight:600;opacity:.7;margin-bottom:6px;">Check-in</label>
                            <input id="mcrmCheckIn" type="date" required min="${today}" value="${dates.checkIn || today}" style="width:100%;padding:10px 12px;border:1.5px solid ${d.brand}30;border-radius:8px;font-size:14px;outline:none;" />
                        </div>
                        <div style="flex:1;">
                            <label style="display:block;font-size:12px;font-weight:600;opacity:.7;margin-bottom:6px;">Check-out</label>
                            <input id="mcrmCheckOut" type="date" required min="${dates.checkIn || tomorrow}" value="${dates.checkOut || tomorrow}" style="width:100%;padding:10px 12px;border:1.5px solid ${d.brand}30;border-radius:8px;font-size:14px;outline:none;" />
                        </div>
                    </div>
                    <div>
                        <label style="display:block;font-size:12px;font-weight:600;opacity:.7;margin-bottom:6px;">Guests</label>
                        <select id="mcrmGuests" style="width:100%;padding:10px 12px;border:1.5px solid ${d.brand}30;border-radius:8px;font-size:14px;outline:none;background:white;">
                            ${[...Array(selectedRoom.capacity)].map((_, i) => `<option value="${i+1}" ${guests === i+1 ? 'selected' : ''}>${i+1} ${i===0 ? 'Guest' : 'Guests'}</option>`).join('')}
                        </select>
                    </div>
                    <button id="mcrmCheckBtn" type="submit" style="width:100%;padding:14px;background:${d.brand};color:${d.btnText};border:none;border-radius:${d.radius};font-size:16px;font-weight:700;cursor:pointer;margin-top:8px;">Check Availability</button>
                </form>
            `;

            setTimeout(() => {
                const ci = container.querySelector('#mcrmCheckIn');
                const co = container.querySelector('#mcrmCheckOut');
                const g = container.querySelector('#mcrmGuests');
                
                ci.onchange = () => { dates.checkIn = ci.value; co.min = ci.value; };
                co.onchange = () => dates.checkOut = co.value;
                g.onchange = () => guests = parseInt(g.value);
                
                container.querySelector('#mcrmDateForm').onsubmit = checkAvailability;
            }, 0);
        }

        // STEP: FORM
        if (step === 'form') {
            bodyWrap.innerHTML = `
                <div style="margin-bottom:24px;border:1.5px solid ${d.brand}30;padding:16px;border-radius:${d.radius};">
                    <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px;"><span style="opacity:.6;">Stay</span><span style="font-weight:600;">${availability.nights} ${availability.nights === 1 ? 'Night' : 'Nights'}</span></div>
                    <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:700;padding-top:8px;border-top:1px dashed ${d.brand}30;"><span style="opacity:.8;">Total Amount</span><span style="color:${d.brand};">₹${Number(availability.totalAmount).toLocaleString('en-IN')}</span></div>
                    <div style="text-align:right;font-size:11px;opacity:0.5;margin-top:4px;">Pay at property</div>
                </div>

                <form id="mcrmGuestForm" style="display:flex;flex-direction:column;gap:16px;">
                    <div>
                        <label style="display:block;font-size:12px;font-weight:600;opacity:.7;margin-bottom:6px;">Full Name *</label>
                        <input name="guestName" required placeholder="John Doe" style="width:100%;padding:12px 14px;border:1.5px solid ${d.brand}30;border-radius:8px;font-size:14px;outline:none;" onfocus="this.style.borderColor='${d.brand}'" onblur="this.style.borderColor='${d.brand}30'" />
                    </div>
                    <div>
                        <label style="display:block;font-size:12px;font-weight:600;opacity:.7;margin-bottom:6px;">Email Address *</label>
                        <input name="guestEmail" type="email" required placeholder="john@example.com" style="width:100%;padding:12px 14px;border:1.5px solid ${d.brand}30;border-radius:8px;font-size:14px;outline:none;" onfocus="this.style.borderColor='${d.brand}'" onblur="this.style.borderColor='${d.brand}30'" />
                    </div>
                    <div>
                        <label style="display:block;font-size:12px;font-weight:600;opacity:.7;margin-bottom:6px;">Phone Number (Optional)</label>
                        <input name="guestPhone" type="tel" placeholder="+1 234 567 8900" style="width:100%;padding:12px 14px;border:1.5px solid ${d.brand}30;border-radius:8px;font-size:14px;outline:none;" onfocus="this.style.borderColor='${d.brand}'" onblur="this.style.borderColor='${d.brand}30'" />
                    </div>
                    <button type="submit" style="width:100%;padding:14px;background:${d.brand};color:${d.btnText};border:none;border-radius:${d.radius};font-size:16px;font-weight:700;cursor:pointer;margin-top:8px;">Confirm Booking</button>
                </form>
            `;

            setTimeout(() => {
                container.querySelector('#mcrmGuestForm').onsubmit = submitBooking;
            }, 0);
        }

        wrap.appendChild(bodyWrap);
        container.appendChild(wrap);

        // Bind Back Button
        setTimeout(() => {
            const backBtn = container.querySelector('#mcrmBack');
            if (backBtn) {
                backBtn.onclick = () => {
                    if (step === 'form') step = 'select-dates';
                    else if (step === 'select-dates') step = 'select-room';
                    renderWidget();
                };
            }
        }, 0);
    }

    function el(tag, attrs) {
        const e = document.createElement(tag);
        if (attrs) Object.entries(attrs).forEach(([k, v]) => { if (k === 'style') e.style.cssText = v; else e.setAttribute(k, v); });
        return e;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
