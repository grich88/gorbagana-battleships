// Gorbagana Battleship - Enhanced Configuration
// Configuration for cross-device game storage and RPC endpoints

export const BATTLESHIP_CONFIG = {
  // Backend API Configuration
  API: {
    BASE_URL: process.env.NEXT_PUBLIC_API_URL || 
             (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
               ? 'https://gorbagana-battleship-backend.onrender.com'
               : 'http://localhost:3002'),
    HEALTH_ENDPOINT: '/health',
    GAMES_ENDPOINT: '/api/games',
    TIMEOUT: 5000,
  },

  // Gorbagana RPC Endpoints
  RPC: {
    PRIMARY: 'https://rpc.gorbagana.wtf/',
    SECONDARY: 'https://gorchain.wstf.io',
    FALLBACK: 'https://api.devnet.solana.com',
  },

  // Game Features
  FEATURES: {
    CROSS_DEVICE: true,
    PUBLIC_LOBBY: true,
    BACKEND_FALLBACK: true,
    REAL_TIME_SYNC: true,
    GAME_SHARING: true,
  },

  // Polling and Sync Configuration
  SYNC: {
    POLL_INTERVAL: 2000,        // Poll blockchain every 2 seconds
    SYNC_INTERVAL: 5000,        // Sync with storage every 5 seconds
    MAX_POLL_ATTEMPTS: 30,      // 60 seconds total
    CLEANUP_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
  },

  // Storage Configuration
  STORAGE: {
    PREFIX: 'gorbagana_battleship_',
    SHARED_PREFIX: 'shared_battleship_games',
    CONNECTION_STATUS_KEY: 'backend_status',
    GAME_HISTORY_LIMIT: 10,
  },

  // UI Configuration
  UI: {
    SHOW_DEBUG_INFO: process.env.NODE_ENV === 'development',
    TOAST_DURATION: 5000,
    LOADING_TIMEOUT: 30000,
  },

  // Version Information
  VERSION: '2.0.0',
  BUILD_TIMESTAMP: new Date().toISOString(),
  CACHE_BUST_ID: 'ENHANCED-BATTLESHIP-v2.0-' + Date.now(),
};

// Deployment environment detection
export const isProduction = () => {
  if (typeof window === 'undefined') return false;
  return window.location.hostname !== 'localhost' && 
         !window.location.hostname.includes('vercel.app');
};

// RPC endpoint selection
export const getBestRPCEndpoint = async (): Promise<string> => {
  const endpoints = [
    BATTLESHIP_CONFIG.RPC.PRIMARY,
    BATTLESHIP_CONFIG.RPC.SECONDARY,
    BATTLESHIP_CONFIG.RPC.FALLBACK
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getHealth',
          params: []
        }),
        signal: AbortSignal.timeout(BATTLESHIP_CONFIG.API.TIMEOUT)
      });

      if (response.ok) {
        console.log(`✅ Selected RPC endpoint: ${endpoint}`);
        return endpoint;
      }
    } catch (error) {
      console.warn(`❌ RPC endpoint ${endpoint} failed:`, error);
    }
  }

  console.warn('⚠️ No RPC endpoints responding, using primary as fallback');
  return BATTLESHIP_CONFIG.RPC.PRIMARY;
};

// API endpoint configuration
export const getAPIBaseURL = (): string => {
  return BATTLESHIP_CONFIG.API.BASE_URL;
};

export default BATTLESHIP_CONFIG; 