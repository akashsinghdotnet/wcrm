import { Controller, Get, Header } from '@nestjs/common';

@Controller()
export class WidgetController {
    @Get('widget/booking.js')
    @Header('Content-Type', 'application/javascript')
    @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
    @Header('Access-Control-Allow-Origin', '*')
    serveBookingWidget(): string {
        return BOOKING_WIDGET_JS;
    }

    @Get('widget/event-booking.js')
    @Header('Content-Type', 'application/javascript')
    @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
    @Header('Access-Control-Allow-Origin', '*')
    serveEventWidget(): string {
        return EVENT_WIDGET_JS;
    }
}

const BOOKING_WIDGET_JS = `
(function () {
    var API_BASE = 'https://api.magnetcrm.com/api';
    var script = document.currentScript;
    var bookingSlug = script.getAttribute('data-slug');
    var meetingSlug = script.getAttribute('data-meeting');
    var mode = script.getAttribute('data-mode') || 'popup';
    var buttonText = script.getAttribute('data-button-text') || 'Book Appointment';

    if (!bookingSlug || !meetingSlug) { console.error('[MagnetCRM] data-slug and data-meeting required.'); return; }

    var company = null, meetingType = null, design = {}, settings = {};
    var selectedDate = new Date().toISOString().split('T')[0];
    var slots = [], selectedSlot = null, step = 'calendar';
    var container = null, formData = {};

    function fetchJSON(url, cb) {
        var x = new XMLHttpRequest();
        x.open('GET', url);
        x.onload = function () { if (x.status === 200) cb(null, JSON.parse(x.responseText)); else cb('error'); };
        x.onerror = function () { cb('error'); };
        x.send();
    }

    function postJSON(url, data, cb) {
        var x = new XMLHttpRequest();
        x.open('POST', url);
        x.setRequestHeader('Content-Type', 'application/json');
        x.onload = function () { var r = JSON.parse(x.responseText); if (x.status >= 200 && x.status < 300) cb(null, r); else cb(r.message || 'error'); };
        x.onerror = function () { cb('error'); };
        x.send(JSON.stringify(data));
    }

    function init() {
        fetchJSON(API_BASE + '/public/booking/' + bookingSlug + '/' + meetingSlug, function (err, data) {
            if (err) { console.error('[MagnetCRM] Failed to load booking data'); return; }
            company = data.company;
            meetingType = data.meetingType;
            settings = data.settings || {};
            design = {
                brand: settings.brandColor || '#4f46e5',
                bg: settings.bgColor || '#ffffff',
                text: settings.textColor || '#111827',
                btnText: settings.buttonTextColor || '#ffffff',
                radius: (settings.borderRadius || '12') + 'px',
                submitText: settings.submitButtonText || 'Schedule Event'
            };
            if (mode === 'inline') {
                container = document.createElement('div');
                script.parentNode.insertBefore(container, script);
                loadSlots(selectedDate);
            } else {
                renderPopupButton();
            }
        });
    }

    function loadSlots(date) {
        selectedDate = date;
        selectedSlot = null;
        step = 'calendar';
        fetchJSON(API_BASE + '/public/booking/' + bookingSlug + '/' + meetingSlug + '/availability?date=' + date, function (err, data) {
            slots = (!err && data && data.availableSlots) ? data.availableSlots : [];
            render();
        });
    }

    function submitBooking() {
        postJSON(API_BASE + '/public/booking/' + bookingSlug + '/' + meetingSlug + '/book',
            { guestName: formData.guestName, guestEmail: formData.guestEmail, guestPhone: formData.guestPhone, guestNotes: formData.guestNotes || '', date: selectedDate, startTime: selectedSlot },
            function (err, data) {
                if (err) { alert(err); return; }
                if (data.thankYouUrl) { window.location.href = data.thankYouUrl; return; }
                step = 'success';
                render();
            }
        );
    }

    function renderPopupButton() {
        var btn = document.createElement('button');
        btn.textContent = buttonText;
        btn.style.cssText = 'background:' + design.brand + ';color:' + design.btnText + ';padding:14px 28px;border:none;border-radius:' + design.radius + ';font-size:16px;font-weight:700;cursor:pointer;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.15);transition:transform .15s;';
        btn.onmouseenter = function () { btn.style.transform = 'translateY(-2px)'; };
        btn.onmouseleave = function () { btn.style.transform = ''; };
        btn.onclick = openModal;
        script.parentNode.insertBefore(btn, script);
    }

    function openModal() {
        var overlay = document.createElement('div');
        overlay.id = 'mcrmOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px);';
        overlay.onclick = function (e) { if (e.target === overlay) overlay.remove(); };

        container = document.createElement('div');
        container.style.cssText = 'max-width:800px;width:100%;max-height:90vh;overflow-y:auto;border-radius:' + design.radius + ';box-shadow:0 25px 60px rgba(0,0,0,.3);position:relative;';

        var closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&#10005;';
        closeBtn.style.cssText = 'position:absolute;top:12px;right:12px;z-index:10;background:rgba(0,0,0,.08);border:none;width:32px;height:32px;border-radius:50%;font-size:14px;cursor:pointer;color:#666;';
        closeBtn.onclick = function () { overlay.remove(); };
        container.appendChild(closeBtn);

        overlay.appendChild(container);
        document.body.appendChild(overlay);
        loadSlots(selectedDate);
    }

    function render() {
        if (!container) return;
        var d = design;
        var isPopup = !!document.getElementById('mcrmOverlay');
        container.innerHTML = '';

        if (isPopup) {
            var closeBtn = document.createElement('button');
            closeBtn.innerHTML = '&#10005;';
            closeBtn.style.cssText = 'position:absolute;top:12px;right:12px;z-index:10;background:rgba(0,0,0,.08);border:none;width:32px;height:32px;border-radius:50%;font-size:14px;cursor:pointer;color:#666;';
            closeBtn.onclick = function () { document.getElementById('mcrmOverlay').remove(); };
            container.appendChild(closeBtn);
        }

        var wrap = document.createElement('div');
        wrap.style.cssText = 'background:' + d.bg + ';border-radius:' + d.radius + ';font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;overflow:hidden;';

        if (step === 'success') {
            wrap.innerHTML = '<div style="padding:48px 32px;text-align:center;">'
                + '<div style="width:64px;height:64px;border-radius:50%;background:#d1fae5;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></div>'
                + '<h2 style="color:' + d.text + ';font-size:22px;font-weight:700;margin:0 0 8px;">Booking Confirmed!</h2>'
                + '<p style="color:' + d.text + ';opacity:.6;font-size:15px;margin:0 0 24px;">' + (settings.confirmationMessage || 'Your appointment has been booked successfully!') + '</p>'
                + '<div style="background:' + d.brand + '08;border-radius:' + d.radius + ';padding:16px;text-align:left;">'
                + '<div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px;"><span style="color:' + d.text + ';opacity:.5;">Meeting</span><span style="color:' + d.text + ';font-weight:600;">' + meetingType.title + '</span></div>'
                + '<div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px;"><span style="color:' + d.text + ';opacity:.5;">Date</span><span style="color:' + d.text + ';font-weight:600;">' + selectedDate + '</span></div>'
                + '<div style="display:flex;justify-content:space-between;font-size:14px;"><span style="color:' + d.text + ';opacity:.5;">Time</span><span style="color:' + d.text + ';font-weight:600;">' + selectedSlot + '</span></div>'
                + '</div></div>';
            container.appendChild(wrap);
            return;
        }

        if (step === 'form') {
            wrap.innerHTML = '<div style="padding:32px;">'
                + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid ' + d.brand + '15;">'
                + '<button id="mcrmBack" style="background:none;border:none;font-size:20px;cursor:pointer;color:' + d.text + ';padding:4px;">&#8592;</button>'
                + '<div><h3 style="margin:0;font-size:18px;font-weight:700;color:' + d.text + ';">Enter Your Details</h3>'
                + '<p style="margin:4px 0 0;font-size:14px;color:' + d.brand + ';font-weight:600;">' + selectedDate + ' @ ' + selectedSlot + '</p></div></div>'
                + '<form id="mcrmForm" style="display:flex;flex-direction:column;gap:16px;">'
                + '<div><label style="display:block;font-size:13px;font-weight:600;color:' + d.text + ';opacity:.7;margin-bottom:6px;">Name *</label>'
                + '<input name="guestName" required placeholder="John Doe" style="width:100%;padding:12px 16px;border:1.5px solid ' + d.brand + '30;border-radius:' + d.radius + ';font-size:15px;color:' + d.text + ';background:' + d.bg + ';box-sizing:border-box;outline:none;" /></div>'
                + '<div><label style="display:block;font-size:13px;font-weight:600;color:' + d.text + ';opacity:.7;margin-bottom:6px;">Email *</label>'
                + '<input name="guestEmail" type="email" required placeholder="john@example.com" style="width:100%;padding:12px 16px;border:1.5px solid ' + d.brand + '30;border-radius:' + d.radius + ';font-size:15px;color:' + d.text + ';background:' + d.bg + ';box-sizing:border-box;outline:none;" /></div>'
                + '<div><label style="display:block;font-size:13px;font-weight:600;color:' + d.text + ';opacity:.7;margin-bottom:6px;">Mobile Number *</label>'
                + '<input name="guestPhone" type="tel" required placeholder="+1 (555) 000-0000" style="width:100%;padding:12px 16px;border:1.5px solid ' + d.brand + '30;border-radius:' + d.radius + ';font-size:15px;color:' + d.text + ';background:' + d.bg + ';box-sizing:border-box;outline:none;" /></div>'
                + '<div><label style="display:block;font-size:13px;font-weight:600;color:' + d.text + ';opacity:.7;margin-bottom:6px;">Notes (Optional)</label>'
                + '<textarea name="guestNotes" rows="3" placeholder="Anything you would like us to know..." style="width:100%;padding:12px 16px;border:1.5px solid ' + d.brand + '30;border-radius:' + d.radius + ';font-size:15px;color:' + d.text + ';background:' + d.bg + ';box-sizing:border-box;resize:none;outline:none;font-family:inherit;"></textarea></div>'
                + '<button type="submit" style="width:100%;padding:14px;background:' + d.brand + ';color:' + d.btnText + ';border:none;border-radius:' + d.radius + ';font-size:16px;font-weight:700;cursor:pointer;">' + d.submitText + '</button>'
                + '</form></div>';
            container.appendChild(wrap);

            document.getElementById('mcrmBack').onclick = function () { step = 'calendar'; render(); };
            document.getElementById('mcrmForm').onsubmit = function (e) {
                e.preventDefault();
                var f = e.target;
                formData = { guestName: f.guestName.value, guestEmail: f.guestEmail.value, guestPhone: f.guestPhone.value, guestNotes: f.guestNotes.value };
                submitBooking();
            };
            return;
        }

        // Calendar
        var slotsHtml = '';
        if (slots.length === 0) {
            slotsHtml = '<div style="text-align:center;padding:24px;color:' + d.text + ';opacity:.5;font-size:14px;">No slots available on this date.</div>';
        } else {
            for (var i = 0; i < slots.length; i++) {
                slotsHtml += '<button class="mcrmSlot" data-time="' + slots[i] + '" style="width:100%;padding:12px;border:1.5px solid ' + d.brand + '30;background:transparent;color:' + d.brand + ';font-weight:600;font-size:14px;border-radius:' + d.radius + ';cursor:pointer;text-align:center;font-family:inherit;">' + slots[i] + '</button>';
            }
        }

        wrap.innerHTML = '<div>'
            + '<div style="padding:24px 32px;border-bottom:1px solid ' + d.brand + '10;">'
            + '<p style="margin:0 0 4px;font-size:13px;text-transform:uppercase;letter-spacing:1px;color:' + d.text + ';opacity:.4;font-weight:700;">' + (company ? company.companyName : '') + '</p>'
            + '<h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:' + d.text + ';">' + meetingType.title + '</h2>'
            + '<p style="margin:0;font-size:14px;color:' + d.text + ';opacity:.6;">&#9201; ' + meetingType.duration + ' minutes</p>'
            + (meetingType.description ? '<p style="margin:12px 0 0;font-size:14px;color:' + d.text + ';opacity:.55;">' + meetingType.description + '</p>' : '')
            + '</div>'
            + '<div style="padding:24px 32px;display:flex;gap:24px;flex-wrap:wrap;">'
            + '<div style="flex:1;min-width:200px;">'
            + '<label style="display:block;font-size:13px;font-weight:600;color:' + d.text + ';opacity:.7;margin-bottom:8px;">Select Date</label>'
            + '<input type="date" id="mcrmDate" value="' + selectedDate + '" min="' + new Date().toISOString().split('T')[0] + '" style="width:100%;padding:12px 16px;border:1.5px solid ' + d.brand + '30;border-radius:' + d.radius + ';font-size:15px;color:' + d.text + ';background:' + d.bg + ';box-sizing:border-box;outline:none;" />'
            + '</div>'
            + '<div style="flex:1;min-width:200px;">'
            + '<label style="display:block;font-size:13px;font-weight:600;color:' + d.text + ';opacity:.7;margin-bottom:8px;">Available Times</label>'
            + '<div style="display:flex;flex-direction:column;gap:8px;max-height:280px;overflow-y:auto;">' + slotsHtml + '</div>'
            + '</div></div></div>';
        container.appendChild(wrap);

        document.getElementById('mcrmDate').onchange = function (e) { loadSlots(e.target.value); };
        var slotBtns = container.querySelectorAll('.mcrmSlot');
        for (var j = 0; j < slotBtns.length; j++) {
            (function (btn) {
                btn.onmouseenter = function () { btn.style.background = design.brand; btn.style.color = design.btnText; };
                btn.onmouseleave = function () { btn.style.background = 'transparent'; btn.style.color = design.brand; };
                btn.onclick = function () { selectedSlot = btn.getAttribute('data-time'); step = 'form'; render(); };
            })(slotBtns[j]);
        }
    }

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
`;

export const EVENT_WIDGET_JS = `
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
    let frontendBase = 'https://app.magnetcrm.com';
    if (scriptUrl.hostname === 'localhost' || scriptUrl.hostname === '127.0.0.1') {
        frontendBase = 'http://localhost:5173';
    } else if (scriptUrl.hostname.includes('api.')) {
        frontendBase = scriptUrl.origin.replace('api.', 'app.');
    } else {
        frontendBase = scriptUrl.origin;
    }

    const iframeUrl = frontendBase + '/event/' + eventSlug + '?embed=true';

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
            iframe.style.height = event.data.height + 'px';
        }
    });

    script.parentNode.insertBefore(iframe, script);
})();
`;
