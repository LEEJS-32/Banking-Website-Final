const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Account = require('./models/Account');
const Transaction = require('./models/Transaction');
const FraudDetection = require('./models/FraudDetection');

const migrateDatabase = async () => {
  try {
    console.log('🔄 Starting database migration...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Step 1: Migrate User accounts to Account collection
    console.log('📊 Step 1: Migrating user accounts to Account collection...');
    const users = await mongoose.connection.db.collection('users').find({}).toArray();
    let accountsCreated = 0;
    
    for (const user of users) {
      // Check if account already exists
      const existingAccount = await Account.findOne({ 
        userId: user._id,
        accountNumber: user.accountNumber 
      });
      
      if (!existingAccount && user.accountNumber) {
        const account = new Account({
          userId: user._id,
          accountNumber: user.accountNumber,
          accountType: user.accountType || 'checking',
          balance: user.balance || 0,
          bank: user.bank || 'HSBC',
          country: user.country || 'United Kingdom',
          shippingAddress: user.shippingAddress || user.country || 'United Kingdom',
          isActive: user.isActive !== false,
          isPrimary: true, // First account is primary
          createdAt: user.createdAt || new Date(),
        });
        
        await account.save();
        accountsCreated++;
        console.log(`  ✓ Created account for user: ${user.email} (${user.accountNumber})`);
      }
    }
    console.log(`✅ Created ${accountsCreated} accounts\n`);
    
    // Step 2: Extract fraud detection data to FraudDetection collection
    console.log('📊 Step 2: Extracting fraud detection data...');
    const transactions = await mongoose.connection.db.collection('transactions')
      .find({ 'fraudDetection.checked': true })
      .toArray();
    
    let fraudDetectionsCreated = 0;
    
    for (const txn of transactions) {
      if (txn.fraudDetection && txn.fraudDetection.checked) {
        // Check if fraud detection record already exists
        const existing = await FraudDetection.findOne({ transactionId: txn._id });
        
        if (!existing) {
          const fraudDetection = new FraudDetection({
            transactionId: txn._id,
            checked: true,
            isFraud: txn.fraudDetection.isFraud || false,
            fraudProbability: txn.fraudDetection.fraudProbability || 0,
            riskLevel: txn.fraudDetection.riskLevel || 'low',
            reasons: txn.fraudDetection.reasons || [],
            recommendation: txn.fraudDetection.recommendation || 'APPROVE',
            checkedAt: txn.createdAt || new Date(),
          });
          
          await fraudDetection.save();
          fraudDetectionsCreated++;
          
          // Update transaction to reference fraud detection
          await mongoose.connection.db.collection('transactions').updateOne(
            { _id: txn._id },
            { 
              $set: { fraudDetectionId: fraudDetection._id },
              $unset: { fraudDetection: '' }
            }
          );
        }
      }
    }
    console.log(`✅ Created ${fraudDetectionsCreated} fraud detection records\n`);
    
    // Step 3: Link transactions to accounts
    console.log('📊 Step 3: Linking transactions to accounts...');
    const allTransactions = await mongoose.connection.db.collection('transactions').find({}).toArray();
    let transactionsUpdated = 0;
    
    for (const txn of allTransactions) {
      if (!txn.accountId && txn.userId) {
        // Find user's primary account
        const account = await Account.findOne({ 
          userId: txn.userId,
          isPrimary: true 
        });
        
        if (account) {
          await mongoose.connection.db.collection('transactions').updateOne(
            { _id: txn._id },
            { $set: { accountId: account._id } }
          );
          transactionsUpdated++;
        }
      }
    }
    console.log(`✅ Updated ${transactionsUpdated} transactions with account references\n`);
    
    // Step 4: Drop unique index on accountNumber from User collection
    console.log('📊 Step 4: Dropping unique index on accountNumber...');
    try {
      await mongoose.connection.db.collection('users').dropIndex('accountNumber_1');
      console.log('✅ Dropped accountNumber index\n');
    } catch (err) {
      console.log('ℹ️  Index already dropped or does not exist\n');
    }
    
    // Step 5: Clean up old fields from User collection
    console.log('📊 Step 5: Cleaning up old fields from User collection...');
    await mongoose.connection.db.collection('users').updateMany(
      {},
      { 
        $unset: { 
          accountNumber: '',
          balance: '',
          accountType: '',
          bank: '',
          country: '',
          shippingAddress: ''
        } 
      }
    );
    console.log('✅ Removed account-related fields from User collection\n');
    
    // Step 6: Drop IC number unique index if sparse
    console.log('📊 Step 6: Updating IC number index to sparse...');
    try {
      await mongoose.connection.db.collection('users').dropIndex('icNumber_1');
      await mongoose.connection.db.collection('users').createIndex(
        { icNumber: 1 }, 
        { unique: true, sparse: true }
      );
      console.log('✅ Updated IC number index to sparse\n');
    } catch (err) {
      console.log('ℹ️  IC number index already correct\n');
    }
    
    // Summary
    console.log('=' .repeat(60));
    console.log('✅ MIGRATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`Accounts created: ${accountsCreated}`);
    console.log(`Fraud detection records created: ${fraudDetectionsCreated}`);
    console.log(`Transactions updated: ${transactionsUpdated}`);
    console.log('='.repeat(60));
    
    // Show new structure
    console.log('\n📋 New Collections Summary:');
    const accountCount = await Account.countDocuments();
    const fraudDetectionCount = await FraudDetection.countDocuments();
    console.log(`  • Accounts: ${accountCount}`);
    console.log(`  • Fraud Detections: ${fraudDetectionCount}`);
    console.log(`  • Users: ${users.length}`);
    console.log(`  • Transactions: ${allTransactions.length}`);
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
};

migrateDatabase();
