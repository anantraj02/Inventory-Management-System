const mongoose = require('mongoose');

let mongoServer;

const connectDB = async () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const mongoUri = process.env.MONGO_URI;
  if (isProduction && !mongoUri) {
  throw new Error("MONGO_URI environment variable is missing.");
}

  // If MONGO_URI is explicitly provided or we are in production, connect directly
if (mongoUri) {
  console.log("Connecting to MongoDB Atlas...");
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10000
  });

  console.log(`MongoDB Connected: ${mongoose.connection.host}`);
  return;
}

  // Otherwise, fallback to local/in-memory server for development
  try {
    const localUri = 'mongodb://127.0.0.1:27017/inventory_db';
    console.log(`Connecting to local database at: ${localUri}...`);
    await mongoose.connect(localUri, {
      serverSelectionTimeoutMS: 2000 // 2 seconds timeout
    });
    console.log(`MongoDB Connected: ${mongoose.connection.host}`);
  } catch (localErr) {
    console.error("Local MongoDB connection failed:", localErr.message);
    console.log('Starting in-memory MongoDB server for development...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoServer = await MongoMemoryServer.create();
      const inMemoryUri = mongoServer.getUri();
      console.log(`In-memory MongoDB started at: ${inMemoryUri}`);
      await mongoose.connect(inMemoryUri);
      console.log('Connected to In-memory MongoDB.');
    } catch (memErr) {
      console.error(`In-memory MongoDB failed to start: ${memErr.message}`);
      throw memErr;
    }
  }
};

module.exports = connectDB;
