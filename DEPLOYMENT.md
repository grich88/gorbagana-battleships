# 🚀 Gorbagana Battleship - Production Deployment Guide

## Render.com Deployment

This guide covers deploying the Gorbagana Battleship application to Render.com using their free tier services.

### Prerequisites

1. **GitHub Repository**: Ensure your code is pushed to GitHub
2. **Render Account**: Sign up at [render.com](https://render.com)
3. **MongoDB Atlas**: Database cluster should be running

### 🏗️ Deployment Architecture

```
Frontend (Next.js) → Backend (Express.js) → MongoDB Atlas
     ↓                    ↓                    ↓
  Render Web Service   Render Web Service   Cloud Database
```

### 📋 Step 1: Environment Variables Setup

#### Backend Environment Variables (Set in Render Dashboard):
```
NODE_ENV=production
PORT=3002
MONGODB_URI=mongodb+srv://battleship-user:battleship123@cluster0.trwqa4n.mongodb.net/gorbagana-battleship
CORS_ORIGIN=https://gorbagana-battleship-frontend.onrender.com
```

#### Frontend Environment Variables (Set in Render Dashboard):
```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://gorbagana-battleship-backend.onrender.com
NEXT_PUBLIC_RPC_PRIMARY=https://rpc.gorbagana.wtf/
NEXT_PUBLIC_RPC_SECONDARY=https://gorchain.wstf.io
NEXT_PUBLIC_RPC_FALLBACK=https://api.devnet.solana.com
```

### 🚀 Step 2: Deploy Backend Service

1. **Create New Web Service** in Render Dashboard
2. **Connect GitHub Repository**
3. **Configure Service:**
   - **Name**: `gorbagana-battleship-backend`
   - **Runtime**: `Node`
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
   - **Plan**: `Starter (Free)`
   - **Region**: `Oregon` (recommended)

4. **Set Environment Variables** (see above)
5. **Deploy** and wait for build completion

### 🌐 Step 3: Deploy Frontend Service

1. **Create New Web Service** in Render Dashboard
2. **Connect GitHub Repository**
3. **Configure Service:**
   - **Name**: `gorbagana-battleship-frontend`
   - **Runtime**: `Node`
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Start Command**: `cd frontend && npm start`
   - **Plan**: `Starter (Free)`
   - **Region**: `Oregon` (same as backend)

4. **Set Environment Variables** (see above)
5. **Deploy** and wait for build completion

### 🔧 Step 4: Using render.yaml Blueprint (Alternative)

If you prefer automated deployment, use the included `render.yaml`:

1. **Fork/Import** this repository to Render
2. **Select Blueprint** deployment option
3. **Environment Variables** will need to be set manually:
   - `MONGODB_URI` (backend)
   - URLs will auto-populate between services

### 🔍 Step 5: Verification

After deployment, verify:

1. **Backend Health**: Visit `https://your-backend-url.onrender.com/health`
2. **Frontend Access**: Visit `https://your-frontend-url.onrender.com`
3. **Database Connection**: Check logs for MongoDB connection success
4. **RPC Endpoints**: Verify Gorbagana RPC connectivity in browser console

### 📊 Expected Response from Health Endpoint:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-29T...",
  "database": "MongoDB Atlas",
  "mongoStatus": "connected",
  "environment": "production",
  "gamesStored": 0
}
```

### 🛠️ Step 6: Post-Deployment Configuration

#### Update CORS Settings:
The backend automatically sets CORS based on the `CORS_ORIGIN` environment variable.

#### Test Game Functionality:
1. **Wallet Connection**: Ensure Backpack wallet connects
2. **Game Creation**: Test creating new games
3. **Cross-Device Play**: Test game sharing URLs
4. **Public Lobby**: Verify public games appear
5. **Database Persistence**: Games should persist across deploys

### 🚨 Troubleshooting

#### Common Issues:

1. **Build Failures**:
   - Check Node.js version compatibility (>=18.0.0)
   - Verify all dependencies are in package.json
   - Check build logs for specific errors

2. **Database Connection Failed**:
   - Verify MongoDB Atlas connection string
   - Check MongoDB Atlas network access (0.0.0.0/0 for Render)
   - Ensure database user has proper permissions

3. **CORS Errors**:
   - Update `CORS_ORIGIN` environment variable
   - Ensure frontend URL matches exactly

4. **RPC Connection Issues**:
   - Check Gorbagana RPC endpoint status
   - Verify HTTPS-only connections
   - Monitor browser console for connection errors

#### Debug Commands:
```bash
# Check backend health
curl https://your-backend-url.onrender.com/health

# Check backend logs in Render dashboard
# Check frontend build logs in Render dashboard
```

### 🔄 Step 7: Updates and Redeployment

1. **Auto-Deploy**: Enabled by default on git push to main branch
2. **Manual Deploy**: Use Render dashboard "Deploy Latest" button
3. **Environment Changes**: Require manual redeploy

### 📈 Step 8: Monitoring and Analytics

#### Available Endpoints for Monitoring:
- `GET /health` - Service health check
- `GET /api/analytics` - Game statistics
- `GET /api/games/public` - Public games count

#### Key Metrics to Monitor:
- Response times
- Error rates
- Database connection status
- Active games count
- User engagement

### 🎯 Production URLs

After deployment, your services will be available at:
- **Frontend**: `https://gorbagana-battleship-frontend.onrender.com`
- **Backend**: `https://gorbagana-battleship-backend.onrender.com`
- **API Health**: `https://gorbagana-battleship-backend.onrender.com/health`

### 🔐 Security Considerations

1. **Environment Variables**: Never commit sensitive data to git
2. **MongoDB**: Use strong passwords and IP restrictions
3. **CORS**: Restrict to your frontend domain only
4. **API Rate Limiting**: Enabled in production
5. **Helmet Security**: Enabled for security headers

### 💰 Cost Optimization

- **Free Tier**: 750 hours/month per service (sufficient for hobby projects)
- **Sleep Mode**: Services sleep after 15 minutes of inactivity
- **Cold Starts**: ~30 seconds to wake up from sleep
- **Upgrade**: Consider paid plans for production applications

### 🎮 Game-Specific Features

#### Gorbagana Integration:
- ✅ HTTPS-only RPC connections
- ✅ Multiple endpoint fallbacks
- ✅ Wallet integration (Backpack recommended)
- ✅ Transaction polling and confirmation

#### Cross-Device Gameplay:
- ✅ MongoDB persistence
- ✅ Game sharing via URLs
- ✅ Public lobby system
- ✅ Real-time synchronization

---

## 🎉 Deployment Complete!

Your Gorbagana Battleship application is now live in production! 

Players can:
- 🎯 Play from any device
- 🔗 Share games via URL
- 🌐 Discover public games
- 💰 Use real $GOR transactions
- 🚢 Enjoy multiple game modes

### Next Steps:
1. Share your live URL with players
2. Monitor application health and usage
3. Gather feedback and iterate
4. Consider scaling to paid plans as user base grows

**Happy Gaming! ⚓🎮** 