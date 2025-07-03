const mongoose = require('mongoose');

// BULLETPROOF MongoDB Connection Configuration
const connectDB = async () => {
  // CRITICAL: This function NEVER throws errors or crashes the server
  
  // Check for MongoDB URI
  const mongoURI = process.env.MONGODB_URI;
  if (!mongoURI) {
    console.log('⚠️ No MONGODB_URI provided - using in-memory storage');
    console.log('🎮 Server starting with temporary data storage');
    return null;
  }

  // Set connection timeout to prevent hanging
  const connectionPromise = new Promise(async (resolve) => {
    try {
      console.log('🗄️ Attempting MongoDB connection...');
      console.log('📍 Database URI:', mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
      
      const conn = await mongoose.connect(mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000, // 5 second timeout
        socketTimeoutMS: 5000,
        connectTimeoutMS: 5000,
        maxPoolSize: 5
      });

      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      console.log(`🗑️ Database: ${conn.connection.name}`);
      console.log('💾 Persistent storage enabled');
      resolve(conn);
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      console.log('⚠️ ROBUST FALLBACK: Using in-memory storage');
      console.log('🔧 Server continues normally with temporary data');
      console.log('🎮 All game features remain fully functional');
      resolve(null);
    }
  });

  // Add overall timeout protection
  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => {
      console.log('⏰ MongoDB connection timeout - using in-memory storage');
      resolve(null);
    }, 8000); // 8 second maximum wait
  });

  // Race between connection and timeout
  const result = await Promise.race([connectionPromise, timeoutPromise]);
  return result;
};

// Connection event handlers
mongoose.connection.on('disconnected', () => {
  console.log('📤 MongoDB Disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB Error:', err);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('🔴 MongoDB connection closed through app termination');
  process.exit(0);
});

module.exports = connectDB; 