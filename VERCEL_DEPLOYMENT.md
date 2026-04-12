# 🚀 Deploy KINETIC_DL to Vercel

## ⚠️ Important Limitations

**Vercel has limitations for this type of application:**

1. **yt-dlp won't work on Vercel** - Vercel serverless functions don't support running external binaries like yt-dlp
2. **File downloads won't work** - Vercel functions have limited execution time (10 seconds for Hobby, 60 seconds for Pro)
3. **No persistent storage** - Downloaded files can't be stored on Vercel's filesystem

## 🎯 Recommended Deployment Options

### Option 1: Deploy Frontend Only to Vercel (Recommended)

Deploy just the static frontend (landing page + dashboard UI) to Vercel, and run the backend elsewhere:

**Steps:**
1. Create a new folder for frontend-only:
```bash
mkdir vercel-frontend
cp -r public/* vercel-frontend/
```

2. Create `vercel-frontend/vercel.json`:
```json
{
  "rewrites": [
    { "source": "/", "destination": "/index.html" },
    { "source": "/dashboard", "destination": "/dashboard.html" }
  ]
}
```

3. Deploy to Vercel:
```bash
cd vercel-frontend
vercel
```

4. Run backend on a VPS (DigitalOcean, AWS, etc.)

### Option 2: Deploy to Railway (Best for Full Stack)

Railway supports long-running processes and external binaries:

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login and deploy:
```bash
railway login
railway init
railway up
```

3. Add environment variables in Railway dashboard:
```
YTDLP_PATH=yt-dlp
PORT=3000
```

### Option 3: Deploy to Render (Also Good)

1. Go to https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repo
4. Configure:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Environment:** Add `YTDLP_PATH=yt-dlp`

### Option 4: Deploy to DigitalOcean App Platform

1. Go to https://cloud.digitalocean.com/apps
2. Click "Create App"
3. Connect your GitHub repo
4. Configure:
   - **Build Command:** `npm install && npm run build`
   - **Run Command:** `npm start`

## 📝 If You Still Want to Try Vercel (Limited Functionality)

**Note:** This will deploy the app but downloads won't work due to Vercel's limitations.

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

### Step 3: Deploy

```bash
# Build first
npm run build

# Deploy
vercel
```

Follow the prompts:
- Set up and deploy? **Y**
- Which scope? Select your account
- Link to existing project? **N**
- Project name? **kinetic-downloader**
- Directory? **.**
- Override settings? **N**

### Step 4: Set Environment Variables

```bash
vercel env add YTDLP_PATH
# Enter: yt-dlp

vercel env add NODE_ENV
# Enter: production
```

### Step 5: Deploy to Production

```bash
vercel --prod
```

## 🎨 Frontend-Only Deployment (Working Solution)

If you just want to deploy the beautiful UI:

1. Create `public/vercel.json`:
```json
{
  "rewrites": [
    { "source": "/", "destination": "/index.html" },
    { "source": "/dashboard", "destination": "/dashboard.html" }
  ]
}
```

2. Deploy only the public folder:
```bash
cd public
vercel
```

This will give you a live demo of the UI, but you'll need to run the backend locally or on another service.

## 🏆 Best Solution: Hybrid Approach

1. **Frontend on Vercel** (free, fast CDN)
   - Deploy `public/` folder to Vercel
   - Get a URL like: `kinetic-dl.vercel.app`

2. **Backend on Railway/Render** (supports yt-dlp)
   - Deploy full app to Railway
   - Get a URL like: `kinetic-dl.railway.app`

3. **Update Frontend API Calls**
   - In `public/js/app.js`, change:
   ```javascript
   this.apiBase = 'https://kinetic-dl.railway.app/api';
   ```

## 📊 Comparison

| Platform | yt-dlp Support | Cost | Setup Difficulty |
|----------|---------------|------|------------------|
| Vercel | ❌ No | Free | Easy |
| Railway | ✅ Yes | $5/month | Easy |
| Render | ✅ Yes | Free tier | Easy |
| DigitalOcean | ✅ Yes | $5/month | Medium |
| AWS/GCP | ✅ Yes | Variable | Hard |

## 🎯 My Recommendation

**Use Railway for the full app** - It's the easiest option that supports everything:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up

# Open in browser
railway open
```

That's it! Railway will automatically:
- Install yt-dlp
- Build your TypeScript
- Start the server
- Give you a public URL

## 🆘 Need Help?

If you want to proceed with any of these options, let me know which one and I can provide more detailed steps!
