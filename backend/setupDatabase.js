const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  password: String,
  accountNumber: { type: String, unique: true },
  balance: { type: Number, default: 0 },
  accountType: { type: String, default: 'checking' },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  isActive: { type: Boolean, default: true },
  biometricCredentials: [{ credentialId: String, publicKey: String, counter: Number, deviceName: String, enrolledAt: Date }],
  biometricEnabled: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);

async function setupDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Update existing users to have proper role and isActive fields
    console.log('🔄 Updating existing users...');
    const roleUpdate = await User.updateMany(
      { role: { $exists: false } },
      { $set: { role: 'user' } }
    );
    if (roleUpdate.modifiedCount > 0) {
      console.log(`✅ Updated ${roleUpdate.modifiedCount} users to have role: 'user'`);
    }

    const isActiveUpdate = await User.updateMany(
      { isActive: { $exists: false } },
      { $set: { isActive: true } }
    );
    if (isActiveUpdate.modifiedCount > 0) {
      console.log(`✅ Updated ${isActiveUpdate.modifiedCount} users to have isActive: true`);
    }

    // 2. Create admin user if doesn't exist
    const existingAdmin = await User.findOne({ email: 'admin@securebank.com' });
    if (existingAdmin) {
      console.log('✅ Admin user already exists');
    } else {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);

      await User.create({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@securebank.com',
        password: hashedPassword,
        accountNumber: '0000000000',
        balance: 0,
        accountType: 'checking',
        role: 'admin',
        isActive: true,
      });

      console.log('✅ Admin user created successfully!');
      console.log('----------------------------------');
      console.log('Email: admin@securebank.com');
      console.log('Password: admin123');
      console.log('----------------------------------');
      console.log('⚠️  Please change the password after first login!');
    }

    // 3. Display final statistics
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    console.log('\n📊 Database Statistics:');
    console.log(`👥 Total Users: ${totalUsers}`);
    console.log(`🛡️  Total Admins: ${totalAdmins}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up database:', error);
    process.exit(1);
  }
}

setupDatabase();
    
    if (existingAdmin) {
      console.log('Admin user already exists!');
      console.log('Email: admin@securebank.com');
      process.exit(0);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    // Create admin user
    const admin = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@securebank.com',
      password: hashedPassword,
      accountNumber: '0000000000',
      balance: 0,
      accountType: 'checking',
      role: 'admin',
      isActive: true,
      biometricEnabled: false,
      biometricCredentials: [],
      createdAt: new Date(),
    });

    console.log('✅ Admin user created successfully!');
    console.log('----------------------------------');
    console.log('Email: admin@securebank.com');
    console.log('Password: admin123');
    console.log('----------------------------------');
    console.log('Please change the password after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
}

createAdmin();
