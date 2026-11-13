import mongoose from 'mongoose';

let gridFsBucket = null;

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('⚠️ MONGODB_URI not provided. Running in memory / demo mode.');
    return null;
  }

  try {
    const conn = await mongoose.connect(uri, {
      autoIndex: true,
    });
    console.log(`✅ MongoDB Atlas connected: ${conn.connection.host}`);

    // Initialize GridFS bucket "evidence"
    gridFsBucket = new mongoose.mongo.GridFSBucket(conn.connection.db, {
      bucketName: 'evidence',
    });
    console.log('✅ GridFS bucket "evidence" initialized.');

    return conn;
  } catch (error) {
    console.error('❌ MongoDB Atlas connection failed:', error.message);
    throw error;
  }
}

export function getGridFSBucket() {
  return gridFsBucket;
}
