const mongoose = require('mongoose');
require('dotenv').config();

async function checkRateLimitStatus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    const users = await db.collection('users').find({ role: 'user' }).toArray();
    
    console.log('='.repeat(80));
    console.log('USER RATE LIMIT STATUS');
    console.log('='.repeat(80));
    
    const now = new Date();
    
    for (const user of users) {
      console.log(`\n👤 ${user.firstName} ${user.lastName} (${user.email})`);
      console.log('-'.repeat(80));
      
      // Check if blocked
      if (user.transactionBlockedUntil && new Date(user.transactionBlockedUntil) > now) {
        const minutesLeft = Math.ceil((new Date(user.transactionBlockedUntil) - now) / 60000);
        console.log(`🚫 BLOCKED until ${new Date(user.transactionBlockedUntil).toLocaleString()}`);
        console.log(`   Time remaining: ${minutesLeft} minutes`);
        console.log(`   Reason: ${user.transactionBlockReason || 'Unknown'}`);
      } else {
        console.log('✅ Not blocked');
      }
      
      // Show recent transactions
      if (user.recentTransactions && user.recentTransactions.length > 0) {
        console.log(`\n📊 Recent Transactions (${user.recentTransactions.length}):`);
        
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        
        user.recentTransactions.forEach((txn, idx) => {
          const timestamp = new Date(txn.timestamp);
          const age = Math.ceil((now - timestamp) / 60000);
          const weight = txn.weight || 1;
          const inRapidWindow = timestamp > fiveMinutesAgo;
          const inHourlyWindow = timestamp > oneHourAgo;
          
          console.log(`   ${idx + 1}. RM${txn.amount} - ${age} min ago - Weight: ${weight}`);
          console.log(`      ${inRapidWindow ? '🔴 IN 5-MIN WINDOW' : '⚪ Outside 5-min'} | ${inHourlyWindow ? '🟡 IN 1-HOUR WINDOW' : '⚪ Outside 1-hour'}`);
        });
        
        // Calculate counts
        const rapidCount = user.recentTransactions
          .filter(t => new Date(t.timestamp) > fiveMinutesAgo)
          .reduce((sum, t) => sum + (t.weight || 1), 0);
        
        const hourlyCount = user.recentTransactions
          .reduce((sum, t) => sum + (t.weight || 1), 0);
        
        console.log(`\n📈 Rate Limit Status:`);
        console.log(`   Rapid Fire (5 min): ${rapidCount}/3 transactions`);
        console.log(`   Hourly Limit: ${hourlyCount}/10 transactions`);
        
        if (rapidCount >= 3) {
          console.log(`   ⚠️  WARNING: Rapid fire limit REACHED!`);
        }
        if (hourlyCount >= 10) {
          console.log(`   ⚠️  WARNING: Hourly limit REACHED!`);
        }
      } else {
        console.log('\n📊 No recent transactions');
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n📋 RATE LIMIT CONFIGURATION:');
    console.log('   • Rapid Fire: 3 transactions per 5 minutes');
    console.log('   • Hourly Limit: 10 transactions per hour');
    console.log('   • High Value (>RM1000): Counts as 2 transactions');
    console.log('   • Block Duration: 30 minutes');
    console.log('='.repeat(80));
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkRateLimitStatus();
