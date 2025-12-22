const mongoose = require('mongoose');

const uri = 'mongodb+srv://leejsjm22_db_user:VXiN9t77bFoScqDS@securebank.k5vk9zy.mongodb.net/?appName=SecureBank';

mongoose.connect(uri)
  .then(async () => {
    console.log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('=== DATABASE COLLECTIONS ===');
    for (const coll of collections) {
      const count = await db.collection(coll.name).countDocuments();
      console.log(`📁 ${coll.name}: ${count} documents`);
    }
    
    // Get sample user data
    console.log('\n=== USERS ===');
    const users = await db.collection('users').find().limit(10).toArray();
    users.forEach(u => {
      console.log(`- ${u.email} (${u.firstName} ${u.lastName}) - Role: ${u.role || 'user'} - Balance: RM${u.balance || 0}`);
    });
    
    // Get recent transactions
    console.log('\n=== RECENT TRANSACTIONS ===');
    const transactions = await db.collection('transactions')
      .find()
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
    
    transactions.forEach(t => {
      console.log(`- ${t.type}: RM${t.amount} - Status: ${t.status} - ${new Date(t.createdAt).toLocaleString()}`);
    });
    
    // Check for fraud websites
    console.log('\n=== FRAUD WEBSITES ===');
    const fraudSites = await db.collection('fraudwebsites').find().toArray();
    if (fraudSites.length > 0) {
      fraudSites.forEach(f => {
        console.log(`- ${f.domain} (${f.merchantName}) - Risk: ${f.riskLevel} - Active: ${f.isActive}`);
      });
    } else {
      console.log('No fraud websites registered');
    }
    
    // Check for pending payments
    console.log('\n=== PENDING PAYMENTS ===');
    const pendingPayments = await db.collection('pendingpayments').find().toArray();
    if (pendingPayments.length > 0) {
      pendingPayments.forEach(p => {
        console.log(`- ${p.sessionId} - Amount: RM${p.amount} - Status: ${p.status}`);
      });
    } else {
      console.log('No pending payments');
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Database check complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
