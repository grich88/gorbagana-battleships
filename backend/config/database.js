const mongoose = require('mongoose');

// MongoDB Connection Configuration
const connectDB = async () => {
  try {
    // Use environment variable or fallback to local MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gorbagana-battleship';
    
    console.log('🗄️ Connecting to MongoDB...');
    console.log('📍 Database URI:', mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')); // Hide credentials in logs
    
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`🗑️ Database: ${conn.connection.name}`);
    
    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    
    // In development, continue without database (use in-memory fallback)
    if (process.env.NODE_ENV !== 'production') {
      console.log('⚠️ Running in development mode - continuing without MongoDB');
      return null;
    }
    
    // In production, exit if no database connection
    process.exit(1);
  }
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