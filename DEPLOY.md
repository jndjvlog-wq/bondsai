# BondSAI — Deploy to Netlify via GoDaddy DNS

## Step 1 — Get API Keys

### ATTOM Data (property ownership, value, sale history)
1. Go to https://api.developer.attomdata.com
2. Sign up for a free trial (or paid plan)
3. Copy your API key

### RentCast (rent estimates, property details)
1. Go to https://app.rentcast.io/app
2. Create account → API Keys section
3. Copy your API key

---

## Step 2 — Push code to GitHub

```bash
cd bondsai/
git init
git add .
git commit -m "Initial BondSAI build"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/bondsai.git
git push -u origin main
```

---

## Step 3 — Deploy on Netlify

1. Go to https://app.netlify.com → "Add new site" → "Import an existing project"
2. Connect your GitHub repo
3. Build settings (auto-detected):
   - Build command: `npm run build`
   - Publish directory: `.next`
4. Click **Deploy**

### Add Environment Variables in Netlify:
Site Settings → Environment Variables → Add:

```
ATTOM_API_KEY         = your_key_here
RENTCAST_API_KEY      = your_key_here
NEXT_PUBLIC_APP_NAME  = BondSAI
NEXT_PUBLIC_APP_URL   = https://bondsai.us
RATE_LIMIT_MAX_REQUESTS = 30
RATE_LIMIT_WINDOW_MS  = 60000
```

---

## Step 4 — Connect GoDaddy domain (bondsai.us)

### In Netlify:
1. Site Settings → Domain Management → Add custom domain
2. Type `bondsai.us` → Verify

### In GoDaddy DNS:
1. Login to GoDaddy → My Products → bondsai.us → DNS
2. Delete existing A records for `@`
3. Add these records:

| Type  | Name | Value                        | TTL  |
|-------|------|------------------------------|------|
| A     | @    | 75.2.60.5                    | 600  |
| CNAME | www  | YOUR-SITE.netlify.app        | 600  |

> Get your Netlify subdomain from: Site Settings → Domain → Netlify subdomain

4. Wait 10–30 minutes for DNS propagation

### Enable HTTPS in Netlify:
Site Settings → Domain Management → HTTPS → "Verify DNS configuration" → "Provision certificate"

---

## Step 5 — Test

Visit https://bondsai.us
- Search by name, address, or ZIP
- Check `/api/health` to confirm API keys are loaded

---

## Local Development

```bash
npm install
cp .env.example .env.local
# Fill in your keys in .env.local
npm run dev
# Open http://localhost:3000
```
