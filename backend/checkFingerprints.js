const mongoose = require('mongoose');
require('dotenv').config();

async function checkFingerprintData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    
    console.log('='.repeat(70));
    console.log('FINGERPRINT DATA IN MONGODB');
    console.log('='.repeat(70));
    
    const users = await db.collection('users').find({ fingerprintEnrolled: true }).toArray();
    
    if (users.length === 0) {
      console.log('\nNo users with fingerprints enrolled.');
    } else {
      console.log(`\nFound ${users.length} user(s) with fingerprint data:\n`);
      
      users.forEach((user, idx) => {
        console.log(`${idx + 1}. ${user.firstName} ${user.lastName} (${user.email})`);
        console.log(`   Enrolled: ${user.fingerprintEnrolled}`);
        console.log(`   Device: ${user.fingerprintDevice}`);
        console.log(`   Enrolled At: ${user.fingerprintEnrolledAt}`);
        console.log(`   Has Fingerprint Data: ${user.fingerprintData ? 'Yes' : 'No'}`);
        if (user.fingerprintData) {
          console.log(`   Fingerprint Size: ${JSON.stringify(user.fingerprintData).length} bytes`);
        }
        console.log('');
      });
    }
    
    console.log('='.repeat(70));
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkFingerprintData();
