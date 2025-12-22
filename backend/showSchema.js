const mongoose = require('mongoose');

const uri = 'mongodb+srv://leejsjm22_db_user:VXiN9t77bFoScqDS@securebank.k5vk9zy.mongodb.net/?appName=SecureBank';

mongoose.connect(uri)
  .then(async () => {
    console.log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    
    // List all collections
    const collections = await db.listCollections().toArray();
    
    console.log('='.repeat(80));
    console.log('DATABASE SCHEMA - COLLECTION ATTRIBUTES');
    console.log('='.repeat(80));
    
    for (const coll of collections) {
      const collName = coll.name;
      const count = await db.collection(collName).countDocuments();
      
      console.log(`\n📁 ${collName.toUpperCase()} (${count} documents)`);
      console.log('-'.repeat(80));
      
      // Get a sample document to show structure
      const sample = await db.collection(collName).findOne();
      
      if (sample) {
        const fields = Object.keys(sample);
        fields.forEach(field => {
          const value = sample[field];
          const type = Array.isArray(value) ? 'Array' : typeof value;
          const preview = Array.isArray(value) 
            ? `[${value.length} items]` 
            : type === 'object' && value !== null && !(value instanceof Date)
              ? `{${Object.keys(value).join(', ')}}`
              : type === 'string' && value.length > 50
                ? `"${value.substring(0, 47)}..."`
                : JSON.stringify(value);
          
          console.log(`  • ${field}: ${type} = ${preview}`);
        });
      } else {
        console.log('  (empty collection)');
      }
    }
    
    console.log('\n' + '='.repeat(80));
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
