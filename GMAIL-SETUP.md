# Gmail SMTP Setup - Send from Your Personal Email

## 🎯 Goal

Send invitation emails from your Gmail account (`andrewabishek1996@gmail.com`) without needing a custom domain.

## 🚀 Quick Setup (10 minutes)

### Step 1: Enable 2-Factor Authentication on Gmail

1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Click "Security" on the left
3. Under "Signing in to Google", enable "2-Step Verification"
4. Follow the setup process

### Step 2: Create App Password for Gmail

1. Still in Google Account → Security
2. Under "Signing in to Google", click "App passwords"
3. Select app: "Mail"
4. Select device: "Other (custom name)"
5. Enter: "CMS Application"
6. Click "Generate"
7. **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)

### Step 3: Install Nodemailer

```bash
npm install nodemailer
npm install @types/nodemailer --save-dev
```

### Step 4: Update Environment Variables

Add to your `.env.local`:

```bash
# Gmail SMTP Configuration
GMAIL_USER=andrewabishek1996@gmail.com
GMAIL_APP_PASSWORD=your_16_character_app_password_here
EMAIL_FROM_NAME=Your Clinic Name
```

### Step 5: Update Email API

Replace the Resend code with Gmail SMTP in `/src/app/api/send-invitation/route.ts`

## ✅ Benefits of Gmail SMTP

- ✅ Uses your existing email address
- ✅ No domain verification needed
- ✅ Professional appearance (from your email)
- ✅ Reliable delivery (Gmail reputation)
- ✅ Free (Gmail's sending limits)

## 📊 Gmail Sending Limits

- **500 emails per day** (more than enough for most clinics)
- **100 recipients per email**
- Perfect for invitation system

## 🔒 Security Notes

- App passwords are safer than your main password
- Only works with 2FA enabled
- Can be revoked anytime
- Specific to this application

---

**Ready to set this up?** Let me know when you've created the app password and I'll update the code!
