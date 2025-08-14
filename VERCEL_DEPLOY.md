# 🚀 Vercel Deployment Guide for Rattehin

## 📋 Prerequisites
1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Push your code to GitHub
3. **OCR.Space API Key**: `K82908052588957`

## 🔧 Environment Variables Setup
After deploying, add these environment variables in Vercel dashboard:

### Required Environment Variables:
```
OCR_SPACE_API_KEY=K82908052588957
NODE_ENV=production
APP_VERSION=2.1
```

## 📁 Project Structure for Vercel:
```
rattehin/
├── api/
│   └── ocr.js          # Serverless OCR endpoint
├── public/
│   ├── index.html      # Main app
│   ├── app.js          # Client-side logic
│   ├── manifest.json   # PWA manifest
│   └── sw.js           # Service worker
├── vercel.json         # Vercel configuration
├── package.json        # Dependencies
└── server.js           # Legacy server (for local dev)
```

## 🚀 Deployment Steps:

### 1. Connect to Vercel
- Go to [vercel.com/dashboard](https://vercel.com/dashboard)
- Click "New Project"
- Import from GitHub: `Rannamaari/rattehin`

### 2. Configure Project
- **Framework Preset**: Other
- **Root Directory**: `.` (default)
- **Build Command**: Leave empty
- **Output Directory**: `public`
- **Install Command**: `npm install`

### 3. Add Environment Variables
In Vercel dashboard → Project → Settings → Environment Variables:
```
OCR_SPACE_API_KEY = K82908052588957
NODE_ENV = production  
APP_VERSION = 2.1
```

### 4. Deploy
- Click "Deploy"
- Wait for build to complete
- Get your live URL: `https://your-project.vercel.app`

## 🧪 Testing Deployment
1. **Visit your Vercel URL**
2. **Test OCR**: Upload a bill image
3. **Check Console**: No API errors
4. **Verify Features**: All preset buttons work

## 🔧 API Endpoints
- **Main App**: `https://your-project.vercel.app/`
- **OCR API**: `https://your-project.vercel.app/api/ocr`

## ⚡ Performance Features
- **Serverless Functions**: Auto-scaling OCR processing
- **Static Assets**: Optimized delivery via Vercel CDN
- **Global Edge Network**: Fast loading worldwide
- **Automatic HTTPS**: SSL certificates included

## 🔍 Troubleshooting
- **OCR Errors**: Check environment variables are set
- **404 Errors**: Verify `vercel.json` routing configuration
- **Slow Response**: Function cold starts (normal for serverless)
- **Build Failures**: Check package.json dependencies

## 📱 Mobile Testing
Your Vercel URL will work on all devices:
- **Desktop**: Full features
- **Mobile**: Touch-optimized, PWA-ready
- **Offline**: Service worker caching