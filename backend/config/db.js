const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Create indexes after connection
    await ensureIndexes();
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
};

const ensureIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    
    // Check and create indexes for users collection
    const usersCollection = db.collection('users');
    const usersIndexes = await usersCollection.indexes();
    const hasLocationIndex = usersIndexes.some(idx => idx.key && idx.key.location === '2dsphere');
    
    if (!hasLocationIndex) {
      await usersCollection.createIndex({ location: "2dsphere" });
      console.log('✅ Created 2dsphere index on users collection');
    }
    
    await usersCollection.createIndex({ isAvailable: 1 });
    
    // Check and create indexes for requests collection
    const requestsCollection = db.collection('requests');
    const requestsIndexes = await requestsCollection.indexes();
    const hasRequestLocationIndex = requestsIndexes.some(idx => idx.key && idx.key.location === '2dsphere');
    
    if (!hasRequestLocationIndex) {
      await requestsCollection.createIndex({ location: "2dsphere" });
      console.log('✅ Created 2dsphere index on requests collection');
    }
    
    await requestsCollection.createIndex({ status: 1, urgency: -1, createdAt: -1 });
    await requestsCollection.createIndex({ createdBy: 1, createdAt: -1 });
    await requestsCollection.createIndex({ acceptedBy: 1, createdAt: -1 });
    
    console.log('✅ All database indexes verified/created');
  } catch (error) {
    console.error('Error ensuring indexes:', error.message);
  }
};

module.exports = connectDB;