# 🚀 Deploy KINETIC_DL - Step by Step

## ⚠️ IMPORTANT: Vercel Won't Work for This App

**Vercel doesn't support:**
- Running yt-dlp (external binary)
- Long-running downloads
- File system storage

## ✅ Best Options (Choose One)

### 🥇 Option 1: Railway (EASIEST - Recommended)

**Why Railway?**
- ✅ Supports yt-dlp
- ✅ Easy one-command deploy
- ✅ Free $5 credit monthly
- ✅ Automatic HTTPS
- ✅ No credit card for trial

**Steps:**

1. **Install Railway CLI:**
```bash
npm install -g @railway/cli
```

2. **Login:**
```bash
railway login
```
(Opens browser, login with GitHub)

3. **Initialize and Deploy:**
```bash
railway init
railway up
```

4. **Get Your URL:**
```bash
railway open
```

**Done!** Your app is live! 🎉

---

### 🥈 Option 2: Render (Also Easy)

**Why Render?**
- ✅ Supports yt-dlp
- ✅ Free tier available
- ✅ Automatic HTTPS
- ✅ Easy GitHub integration

**Steps:**

1. **Push code to GitHub:**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

2. **Go to Render:**
- Visit: https://render.com
- Click "Get Started" (sign up with GitHub)

3. **Create New Web Service:**
- Click "New +" → "Web Service"
- Connect your GitHub repo
- Select your repository

4. **Configure:**
- **Name:** kinetic-downloader
- **Environment:** Node
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Instance Type:** Free

5. **Add Environment Variables:**
Click "Advanced" → "Add Environment Variable":
- `YTDLP_PATH` = `yt-dlp`
- `NODE_ENV` = `production`

6. **Click "Create Web Service"**

**Done!** Wait 5-10 minutes for deployment. 🎉

---

### 🥉 Option 3: DigitalOcean App Platform

**Why DigitalOcean?**
- ✅ Reliable
- ✅ $5/month
- ✅ Good performance

**Steps:**

1. **Push to GitHub** (same as Render above)

2. **Go to DigitalOcean:**
- Visit: https://cloud.digitalocean.com/apps
- Click "Create App"

3. **Connect GitHub:**
- Select your repository
- Click "Next"

4. **Configure:**
- **Name:** kinetic-downloader
- **Build Command:** `npm install && npm run build`
- **Run Command:** `npm start`
- **HTTP Port:** 3000

5. **Click "Create Resources"**

**Done!** Wait for deployment. 🎉

---

## 🎨 Alternative: Frontend Only on Vercel

If you just want to showcase the UI (no downloads):

1. **Deploy frontend only:**
```bash
cd public
vercel
```

2. **Follow prompts:**
- Project name: kinetic-downloader-ui
- Deploy: Yes

**Result:** Beautiful UI live on Vercel, but downloads won't work.

---

## 📋 Pre-Deployment Checklist

Before deploying, make sure:

- ✅ Code is working locally (`npm run dev`)
- ✅ All files are committed to Git
- ✅ `package.json` has correct dependencies
- ✅ `tsconfig.json` is present
- ✅ `dist/` folder is in `.gitignore`

---

## 🔧 After Deployment

### Test Your Deployment:

1. **Visit your URL**
2. **Click "ENTER_SYSTEM"**
3. **Paste a YouTube URL**
4. **Click "EXTRACT"**
5. **Select quality**
6. **Click "Initialize Download"**

### If Downloads Don't Work:

**Check logs:**

**Railway:**
```bash
railway logs
```

**Render:**
- Go to your service → "Logs" tab

**Common issues:**
- yt-dlp not installed → Check logs for "yt-dlp not found"
- Timeout → Videos too large, try shorter videos
- Memory limit → Upgrade to paid tier

---

## 💰 Cost Comparison

| Platform | Free Tier | Paid Tier | Best For |
|----------|-----------|-----------|----------|
| Railway | $5 credit/month | $5/month | Development |
| Render | 750 hours/month | $7/month | Production |
| DigitalOcean | No | $5/month | Reliable hosting |
| Vercel | Yes | $20/month | Frontend only |

---

## 🎯 My Recommendation

**For you: Use Railway**

Why?
1. Easiest setup (3 commands)
2. Free $5 credit
3. Works perfectly with yt-dlp
4. No credit card needed for trial

**Commands:**
```bash
npm install -g @railway/cli
railway login
railway init
railway up
railway open
```

That's it! 🚀

---

## 🆘 Need Help?

**Railway not working?**
- Check: `railway logs`
- Ensure yt-dlp is installed: Add to `railway.toml`

**Render not working?**
- Check logs in dashboard
- Verify environment variables are set

**Want to use Vercel anyway?**
- Only frontend will work
- Backend needs separate hosting

---

## 📞 Quick Deploy Commands

**Railway (Recommended):**
```bash
npm install -g @railway/cli && railway login && railway init && railway up
```

**Render:**
1. Push to GitHub
2. Go to render.com
3. Connect repo
4. Deploy

**DigitalOcean:**
1. Push to GitHub
2. Go to cloud.digitalocean.com/apps
3. Connect repo
4. Deploy

Choose one and deploy now! 🚀
