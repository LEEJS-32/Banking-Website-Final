const mongoose = require('mongoose');
require('dotenv').config();

async function fixUserIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // Get current indexes
    console.log('📋 Current indexes on users collection:');
    const indexes = await usersCollection.indexes();
    indexes.forEach(idx => {
      console.log(`  - ${idx.name}:`, idx.key);
    });
    
    // Drop the accountNumber index if it exists
    console.log('\n🔧 Dropping accountNumber_1 index...');
    try {
      await usersCollection.dropIndex('accountNumber_1');
      console.log('✅ Successfully dropped accountNumber_1 index');
    } catch (err) {
      if (err.code === 27 || err.codeName === 'IndexNotFound') {
        console.log('ℹ️  Index accountNumber_1 does not exist (already removed)');
      } else {
        throw err;
      }
    }
    
    // Verify final indexes
    console.log('\n📋 Final indexes on users collection:');
    const finalIndexes = await usersCollection.indexes();
    finalIndexes.forEach(idx => {
      console.log(`  - ${idx.name}:`, idx.key);
    });
    
    console.log('\n✅ Index cleanup complete!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixUserIndexes();
