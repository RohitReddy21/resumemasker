# 🚀 VERCEL DEPLOYMENT GUIDE

## 📋 Prerequisites
- GitHub repository with your code
- Vercel account (free)
- Your project is already configured for Vercel deployment

## 🌟 STEP 1: DEPLOY FRONTEND TO VERCEL

### Method 1: GitHub Integration (Recommended)
1. **Go to [vercel.com](https://vercel.com)**
2. **Sign up/login** with your GitHub account
3. **Click "Add New..." → "Project"**
4. **Import your GitHub repository**: `RohitReddy21/resumemasker`
5. **Configure Build Settings**:
   ```
   Framework Preset: Vite
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   Root Directory: ./
   ```
6. **Add Environment Variables**:
   ```
   VITE_API_BASE_URL=https://your-backend-url.onrender.com
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   ```
7. **Click "Deploy"**

### Method 2: Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from project root
cd /path/to/your/project
vercel --prod

# Follow the prompts to configure
```

## 🔧 VERCEL CONFIGURATION

Your `vercel.json` is already configured:
```json
{
  "version": 2,
  "name": "recruit-shine-board",
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "dist" }
    }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/$1" },
    { "src": "/(.*)", "dest": "/index.html" }
  ],
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": "vite"
}
```

## 📱 Environment Variables for Vercel

In Vercel Dashboard → Settings → Environment Variables:
```
VITE_API_BASE_URL=https://your-backend-url.onrender.com
VITE_OPENAI_API_KEY=sk-your-openai-key-here
```

## ✅ VERCEL DEPLOYMENT CHECKLIST

- [ ] GitHub repository connected
- [ ] Build settings configured
- [ ] Environment variables added
- [ ] Custom domain (optional)
- [ ] SSL certificate (automatic)

## 🌐 After Deployment

Your frontend will be available at:
- **Primary URL**: `https://your-app-name.vercel.app`
- **Custom domain**: If configured

## 🔍 Troubleshooting

### Common Issues:
1. **Build fails**: Check `package.json` scripts
2. **API calls fail**: Verify `VITE_API_BASE_URL` environment variable
3. **404 errors**: Check routing configuration in `vercel.json`

### Debug Commands:
```bash
# Check build locally
npm run build

# Preview build locally
npm run preview

# Check Vercel logs
vercel logs
```

---

## 🎯 NEXT: BACKEND DEPLOYMENT TO RENDER

After deploying frontend to Vercel, proceed with backend deployment to Render using the Render Deployment Guide.
