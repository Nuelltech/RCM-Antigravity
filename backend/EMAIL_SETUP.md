# Email Service Configuration

## Environment Variables Required

Add these to your `.env` file:

```bash
# Resend API
RESEND_API_KEY=re_your_api_key_here

# Email Configuration
EMAIL_FROM_ADDRESS=info@nuelltech.com
EMAIL_FROM_NAME=Restaurante Manager

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000
```

## Getting Resend API Key

1. Sign up at https://resend.com
2. Go to API Keys
3. Create new API key
4. Copy and paste into `.env`

## DNS Configuration (For Production)

When ready to use your final domain, configure these DNS records:

### SPF Record
```
TXT  @  "v=spf1 include:amazonses.com ~all"
```

### DKIM Record
```
TXT  resend._domainkey  [Provided by Resend Dashboard]
```

### DMARC Record
```
TXT  _dmarc  "v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com"
```

## Testing

To test emails locally:
```bash
# Set test environment
EMAIL_FROM_ADDRESS=info@nuelltech.com
FRONTEND_URL=http://localhost:3000

# Emails will be sent to actual addresses
# Use your personal email for testing
```

## Switching to Production Domain

Simply update `.env`:
```bash
EMAIL_FROM_ADDRESS=no-reply@yourfinaldomain.com
FRONTEND_URL=https://app.yourfinaldomain.com
```

No code changes needed! ✅
