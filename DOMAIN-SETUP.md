# Resend Domain Verification - Quick Guide

## 🎯 Current Issue

Resend restricts unverified accounts to only send emails to your registered email address (`andrewabishek1996@gmail.com`). To send invitations to other users, you need to verify a domain.

## 🚀 Quick Solutions

### Option 1: Test with Your Email First

- Try creating an invitation to `andrewabishek1996@gmail.com`
- This will work immediately and verify the email system is working

### Option 2: Verify a Domain (Production Setup)

#### Step 1: Choose Your Domain

- If you have a domain (e.g., `myclinic.com`), use that
- If not, you can register one cheaply at Namecheap, GoDaddy, etc.
- For testing, you could use a free subdomain service

#### Step 2: Add Domain to Resend

1. Go to [resend.com/domains](https://resend.com/domains)
2. Click "Add Domain"
3. Enter your domain (e.g., `myclinic.com`)
4. Resend will provide DNS records to add

#### Step 3: Add DNS Records

Add these records to your domain's DNS settings:

- **SPF Record**: `v=spf1 include:resend.com ~all`
- **DKIM Records**: (Resend will provide specific values)
- **DMARC Record**: `v=DMARC1; p=none;`

#### Step 4: Update the From Address

Once verified, update the code to use your domain:

```typescript
from: 'noreply@myclinic.com', // Use your verified domain
```

### Option 3: Alternative Email Services

If domain verification is too complex right now, consider:

- **Gmail SMTP** (requires app passwords)
- **SendGrid** (similar domain requirements)
- **Email.js** (client-side, limited but works)

## 🔧 Current Workarounds

### For Development/Testing:

1. **Use your email** (`andrewabishek1996@gmail.com`) for testing
2. **Manual sharing** - the link auto-copies to clipboard
3. **Console logging** - see the email content that would be sent

### For Production:

Domain verification is recommended for:

- Professional appearance
- Better deliverability
- No sending restrictions
- Custom branding

## 📞 Quick Test

Try this right now:

1. Create an invitation to `andrewabishek1996@gmail.com`
2. Check if the email arrives
3. This confirms the system works!

---

**Need help with domain verification?** Let me know your domain and I can provide specific DNS instructions!
