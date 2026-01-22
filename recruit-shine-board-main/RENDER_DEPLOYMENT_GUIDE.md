# 🐳 RENDER DEPLOYMENT GUIDE

## 📋 Prerequisites
- GitHub repository with your code
- Render account (free tier available)
- Your Dockerfile is already configured

## 🌟 STEP 1: DEPLOY BACKEND TO RENDER

### Method 1: GitHub Integration (Recommended)
1. **Go to [render.com](https://render.com)**
2. **Sign up/login** with your GitHub account
3. **Click "New +" → "Web Service"**
4. **Connect your GitHub repository**: `RohitReddy21/resumemasker`
5. **Configure Service**:
   ```
   Name: recruit-shine-board-api
   Environment: Docker
   Root Directory: ./backend
   Docker Context: ./backend
   Dockerfile Path: ./backend/Dockerfile
   Instance Type: Free (starts at $0/month)
   Region: Choose nearest region
   ```
6. **Add Environment Variables**:
   ```
   MONGODB_URI=mongodb+srv://rohitreddy956_db_user:Rohit123456@cluster0.6fcx45l.mongodb.net/recruit_shine?retryWrites=true&w=majority&appName=Cluster0
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=8000
   ```
7. **Click "Create Web Service"**

### Method 2: Render CLI
```bash
# Install Render CLI
npm install -g @render/cli

# Login to Render
render login

# Deploy backend
cd backend
render deploy
```

## 🔧 DOCKERFILE CONFIGURATION

Your `backend/Dockerfile` is already configured:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 🔧 REQUIREMENTS.TXT

Ensure your `backend/requirements.txt` includes:
```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-multipart==0.0.6
python-dotenv==1.0.0
motor==3.3.2
pymongo==4.6.0
openai==1.3.7
python-docx==1.1.0
PyPDF2==3.0.1
mammoth==1.8.0
```

## 📱 Environment Variables for Render

In Render Dashboard → Service → Environment:
```
MONGODB_URI=mongodb+srv://rohitreddy956_db_user:Rohit123456@cluster0.6fcx45l.mongodb.net/recruit_shine?retryWrites=true&w=majority&appName=Cluster0
OPENAI_API_KEY=sk-your-openai-key-here
PORT=8000
PYTHON_VERSION=3.11
```

## 🔧 PORT CONFIGURATION

**Important**: Render uses port 8000 by default, but your Dockerfile should expose port 8000.

Update your Dockerfile if needed:
```dockerfile
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## ✅ RENDER DEPLOYMENT CHECKLIST

- [ ] GitHub repository connected
- [ ] Docker configuration verified
- [ ] Environment variables added
- [ ] Port 8000 exposed
- [ ] MongoDB connection tested
- [ ] Health checks configured

## 🌐 After Deployment

Your backend will be available at:
- **Service URL**: `https://your-service-name.onrender.com`
- **API Docs**: `https://your-service-name.onrender.com/docs`
- **API Root**: `https://your-service-name.onrender.com`

## 🔍 Troubleshooting

### Common Issues:
1. **Build fails**: Check Dockerfile and requirements.txt
2. **Database connection fails**: Verify MONGODB_URI
3. **Port issues**: Ensure port 8000 is exposed
4. **CORS errors**: Update CORS settings in main.py

### Debug Commands:
```bash
# Check Docker build locally
cd backend
docker build -t recruit-shine-api .

# Run Docker container locally
docker run -p 8000:8000 recruit-shine-api

# Check Render logs
# Go to Render Dashboard → Service → Logs
```

## 🔧 CORS Configuration

Update your `backend/main.py` to allow your Vercel frontend:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-app-name.vercel.app",
        "http://localhost:8081",  # For local development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## 🎯 PRODUCTION CONFIGURATION

### Health Check
Add health check endpoint to `backend/main.py`:
```python
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}
```

### Auto-Deploy
Enable auto-deploy in Render:
1. Go to Service → Settings
2. Enable "Auto-Deploy on Push"
3. Connect to your main branch

---

## 🎉 DEPLOYMENT COMPLETE!

Once deployed:
1. **Update Vercel environment variable**:
   ```
   VITE_API_BASE_URL=https://your-service-name.onrender.com
   ```

2. **Test the full application**:
   - Frontend: `https://your-app-name.vercel.app`
   - Backend: `https://your-service-name.onrender.com/docs`

3. **Monitor your services**:
   - Vercel Dashboard for frontend
   - Render Dashboard for backend
