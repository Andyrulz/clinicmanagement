# Email Setup Guide - Resend Integration

## 🚀 Quick Setup (5 minutes)

### Step 1: Get Your Resend API Key

1. Go to [resend.com](https://resend.com)
2. Sign up for a free account
3. Go to [API Keys page](https://resend.com/api-keys)
4. Click "Create API Key"
5. Name it something like "CMS Development"
6. Copy the API key (starts with `re_`)

### Step 2: Update Environment Variables

1. Open your `.env.local` file
2. Replace `your_resend_api_key_here` with your actual API key:
   ```bash
   RESEND_API_KEY=re_your_actual_api_key_here
   ```

### Step 3: Domain Setup (Optional for Development)

For production, you'll want to verify your domain:

1. Go to [Resend Domains](https://resend.com/domains)
2. Add your domain (e.g., `yourclinic.com`)
3. Update the `from` field in `/src/app/api/send-invitation/route.ts`

### Step 4: Test the System

1. Restart your development server: `npm run dev`
2. Create an invitation from your admin dashboard
3. Check that:
   - ✅ The link is auto-copied to clipboard
   - ✅ Email is sent (check recipient's inbox/spam)
   - ✅ Invitation link works when clicked

## 📧 Current Features

### Auto-Copy Functionality ✅

- Invitation links are automatically copied to clipboard
- No more manual copying from alert dialogs
- Works as backup even when emails are sent

### Smart Email Handling ✅

- Detects if Resend is configured
- Falls back gracefully if not configured
- Clear messaging about email status
- Console logging for debugging

### Production-Ready Email Template ✅

- Professional HTML email design
- Mobile-responsive layout
- Clear call-to-action button
- Backup text link
- Security messaging

## 🔧 Troubleshooting

### "Email not configured" message?

- Check your `RESEND_API_KEY` in `.env.local`
- Make sure it starts with `re_`
- Restart your development server

### Emails going to spam?

- In production, verify your domain with Resend
- Update the `from` email address to use your domain
- Consider adding SPF/DKIM records

### Clipboard not working?

- Requires HTTPS in production
- Works in localhost for development
- Check browser permissions for clipboard access

## 🎯 Next Steps

1. **Set up Resend API key** (most important)
2. **Test invitation flow** end-to-end
3. **Verify domain** for production use
4. **Customize email template** if needed

## 📊 Resend Free Tier Limits

- 3,000 emails per month
- 100 emails per day
- Perfect for most clinics starting out
- Paid plans available for higher volume

---

**Ready to test?** Just add your Resend API key and restart the server!
