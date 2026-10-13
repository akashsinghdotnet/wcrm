# WhatsApp Integration Troubleshooting Guide

## Quick Diagnosis

We've added comprehensive logging and debugging tools to help diagnose WhatsApp issues. All changes have been deployed to production.

## 🔍 How to Debug WhatsApp Issues

### Step 1: Check Server Logs (MOST IMPORTANT)

All WhatsApp operations now log detailed information with `[WhatsApp]` and `[WhatsApp Webhook]` prefixes.

**To check logs on the server:**

```bash
# SSH into the API server
ssh root@your-server-ip

# View real-time logs
pm2 logs wcrm-backend --lines 100

# Or check recent logs
pm2 logs wcrm-backend --lines 500 | grep -i whatsapp
```

**What to look for in logs:**

**For Outgoing Messages (Not Delivering):**
- `[WhatsApp] Attempting to send message` - Shows the message is being attempted
- `[WhatsApp] Found config` - Confirms WhatsApp is configured
- `[WhatsApp] Formatted phone` - Shows phone number format (should be international format like `919876543210`)
- `[WhatsApp] API Response Status` - Shows Meta's response (200 = success, 4xx/5xx = error)
- `[WhatsApp] Message sent successfully!` - Message was sent ✓
- `[WhatsApp] API error` - Shows specific error from Meta (CRITICAL - read this error!)

**For Incoming Messages (Not Appearing in CRM):**
- `[WhatsApp Webhook] Received webhook payload` - Webhook is being called by Meta
- `[WhatsApp Webhook] Processing message from` - Shows sender's phone number
- `[WhatsApp Webhook] Found existing lead` - Lead matched in system ✓
- `[WhatsApp Webhook] No existing lead found` - Lead not found, will try to auto-create
- `[WhatsApp Webhook] CRITICAL: No WhatsApp config found` - Phone Number ID mismatch! (See Step 3)
- `[WhatsApp Webhook] ✓ Saved incoming message` - Message saved successfully ✓

---

### Step 2: Use the Debug Endpoint

We've added a special debugging endpoint to test your WhatsApp configuration.

**How to use:**

1. Log into Wcrm as Admin
2. Get your company ID from the browser console or URL
3. Open this URL in your browser:
   ```
   https://api.wcrm.si/api/whatsapp/debug/<YOUR_COMPANY_ID>
   ```

**What the debug endpoint shows:**
- ✅ **configured**: true/false - Is WhatsApp configured?
- ✅ **phoneNumberId**: Your Meta Phone Number ID
- ✅ **hasAccessToken**: Is access token saved?
- ✅ **apiTest**: Tests connection to Meta's API
  - status: 'success' = Connected! ✓
  - status: 'failed' = Bad credentials or expired token ✗
  - error: Specific error message from Meta
- ✅ **messageStats**: Count of sent/failed/delivered messages

**Example successful response:**
```json
{
  "configured": true,
  "companyId": "abc123",
  "phoneNumberId": "123456789012345",
  "hasAccessToken": true,
  "apiTest": {
    "status": "success",
    "phoneNumber": "+91 98765 43210",
    "phoneNumberId": "123456789012345",
    "qualityRating": "GREEN"
  },
  "messageStats": [
    { "direction": "outbound", "status": "sent", "count": "45" },
    { "direction": "inbound", "status": "delivered", "count": "32" }
  ]
}
```

---

### Step 3: Common Issues & Solutions

#### ❌ Issue: Outgoing Messages Not Delivering

**Possible Causes:**

1. **Invalid or Expired Access Token**
   - **Check logs for:** `API error (401)` or `API error (190)`
   - **Solution:** Go to Meta Business Suite → WhatsApp → API Setup → Generate new Permanent Access Token
   - Update in: Wcrm → Settings → Integrations → WhatsApp

2. **Wrong Phone Number ID**
   - **Check logs for:** `API error (404)` or "Phone number not found"
   - **Solution:** Verify Phone Number ID in Meta matches what's in Wcrm settings

3. **Phone Number Format Issue**
   - **Check logs for:** `[WhatsApp] Formatted phone: XXXXX`
   - Should show international format (e.g., `919876543210` for Indian numbers)
   - **Solution:** Ensure lead's phone number includes country code or is 10 digits

4. **WhatsApp API Rate Limits**
   - **Check logs for:** `API error (429)` or "rate limit"
   - **Solution:** Wait and try again, or upgrade Meta Business account tier

5. **Template Message Issues**
   - Regular messages can only be sent within 24 hours of last customer message
   - Use approved templates for initial outreach
   - **Check logs for:** "Message outside 24-hour window"

**Debugging Steps:**
```bash
# 1. Check if config exists
curl -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  https://api.wcrm.si/api/whatsapp/debug/<COMPANY_ID>

# 2. Test Meta API directly
curl -H "Authorization: Bearer <ACCESS_TOKEN>" \
  "https://graph.facebook.com/v21.0/<PHONE_NUMBER_ID>"

# 3. Check recent logs
pm2 logs | grep "WhatsApp.*API error"
```

---

#### ❌ Issue: Incoming Messages Not Appearing in CRM

**Possible Causes:**

1. **Webhook Not Configured in Meta**
   - **Check logs for:** No `[WhatsApp Webhook] Received webhook payload` logs
   - **Solution:**
     - Go to Meta Business Suite → WhatsApp → Configuration
     - Set Callback URL: `https://api.wcrm.si/api/whatsapp/webhook`
     - Set Verify Token: `wcrm`
     - Subscribe to `messages` webhook field
     - Click "Verify and Save"

2. **Phone Number ID Mismatch**
   - **Check logs for:** `[WhatsApp Webhook] CRITICAL: No WhatsApp config found for phoneNumberId`
   - This means the Phone Number ID in the webhook doesn't match what's saved in settings
   - **Solution:**
     - Note the `phoneNumberId` from the error log
     - Go to WhatsApp Settings and update Phone Number ID to match
     - Or verify you're using the correct WhatsApp Business Account

3. **No Lead with That Phone Number**
   - **Check logs for:** `[WhatsApp Webhook] No existing lead found for phone`
   - The system will auto-create a lead, but check logs for success
   - **Solution:** Verify auto-created lead appears in Leads page

4. **Webhook Blocked by Firewall**
   - **Check:** Can Meta reach `https://api.wcrm.si/api/whatsapp/webhook`?
   - **Test:** Send test webhook from Meta Configuration page
   - **Solution:** Ensure server firewall allows HTTPS traffic from Meta's IPs

**Debugging Steps:**
```bash
# 1. Test webhook is accessible
curl -X GET "https://api.wcrm.si/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wcrm&hub.challenge=12345"
# Should return: 12345

# 2. Send test message and watch logs in real-time
pm2 logs wcrm-backend --lines 0

# 3. Check webhook configuration in Meta
# Meta Business Suite → WhatsApp → Configuration → Webhook
```

---

#### ❌ Issue: Messages Work but Don't Show Contact Name

**Solution:**
- Meta only sends contact name in webhook payload if user has opted in
- Check webhook logs for `contacts` array
- Consider asking users to save their name in WhatsApp profile

---

### Step 4: Verification Checklist

Before contacting support, verify:

- [ ] WhatsApp configuration saved in Settings → Integrations → WhatsApp
- [ ] Phone Number ID matches Meta Business Suite
- [ ] Access Token is Permanent (not temporary)
- [ ] Access Token not expired (test with debug endpoint)
- [ ] Webhook URL configured in Meta: `https://api.wcrm.si/api/whatsapp/webhook`
- [ ] Verify Token set in Meta: `wcrm`
- [ ] Subscribed to `messages` webhook in Meta
- [ ] Lead exists with correct phone number (for incoming messages)
- [ ] Server logs show `[WhatsApp]` activity
- [ ] No `API error` messages in logs

---

## 📊 Message Flow Diagrams

### Outgoing Message Flow
```
User clicks "Send" in CRM
  ↓
Frontend validates phone number
  ↓
POST /api/whatsapp/send
  ↓
Backend formats phone (adds +91 if 10 digits)
  ↓
Backend sends to Meta API
  ↓
Meta delivers to WhatsApp user
  ↓
Message saved in DB with status (sent/failed)
```

**Check logs at each step:**
- `[WhatsApp] Attempting to send message` → Request started
- `[WhatsApp] Formatted phone` → Phone formatted correctly?
- `[WhatsApp] API Response Status` → What did Meta say?
- `[WhatsApp] Message sent successfully!` → Success!

---

### Incoming Message Flow
```
User sends WhatsApp message
  ↓
Meta receives message
  ↓
Meta sends webhook to https://api.wcrm.si/api/whatsapp/webhook
  ↓
Backend receives webhook
  ↓
Backend finds lead by phone number
  ↓
If no lead found → Auto-create lead
  ↓
Save message in DB
  ↓
Message appears in CRM
```

**Check logs at each step:**
- `[WhatsApp Webhook] Received webhook payload` → Webhook received
- `[WhatsApp Webhook] Processing message from` → Sender identified
- `[WhatsApp Webhook] Found existing lead` OR `Auto-created lead` → Lead matched/created
- `[WhatsApp Webhook] ✓ Saved incoming message` → Success!

---

## 🚨 Critical Errors to Watch For

### 1. Authentication Errors
```
API error (401): Invalid OAuth access token
API error (190): Access token has expired
```
**Fix:** Regenerate access token in Meta Business Suite

### 2. Phone Number Errors
```
API error (404): Phone number not found
CRITICAL: No WhatsApp config found for phoneNumberId XXXXX
```
**Fix:** Verify Phone Number ID matches between Meta and CRM settings

### 3. Permission Errors
```
API error (403): Not authorized to send messages
```
**Fix:** Verify WhatsApp Business Account has messaging permissions

### 4. Rate Limit Errors
```
API error (429): Too many requests
```
**Fix:** Slow down message sending, or upgrade Meta account tier

---

## 📞 Getting Help

If you're still having issues:

1. **Collect this information:**
   - Screenshot of WhatsApp settings page
   - Output from debug endpoint
   - Recent server logs with `[WhatsApp]` entries
   - Specific error messages

2. **Check Meta Business Suite:**
   - Go to WhatsApp → Insights → Message Analytics
   - Check for delivery failures or quality issues

3. **Contact Support:**
   - Send collected information
   - Include company ID and time of issue
   - Describe expected vs actual behavior

---

## ✅ Recent Updates (Deployed)

- ✅ Added comprehensive logging throughout WhatsApp service
- ✅ Added `/api/whatsapp/debug/:companyId` endpoint
- ✅ Enhanced frontend error messages
- ✅ Better webhook debugging
- ✅ Auto-create leads from incoming messages
- ✅ Log all API responses and errors

All changes are now live on production! Check the logs for detailed debugging information.
