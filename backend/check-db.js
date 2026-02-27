const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/AurelionDB';

async function checkDatabase() {
  try {
    console.log('Connecting to:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully\n');

    // List all databases
    const admin = mongoose.connection.db.admin();
    const { databases } = await admin.listDatabases();
    console.log('Available databases:');
    databases.forEach(db => console.log(`  - ${db.name}`));
    console.log('');

    // Check current database
    const dbName = mongoose.connection.db.databaseName;
    console.log(`Current database: ${dbName}\n`);

    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections in', dbName + ':');
    if (collections.length === 0) {
      console.log('  (No collections yet)');
    } else {
      collections.forEach(col => console.log(`  - ${col.name}`));
    }
    console.log('');

    // Check User_Login collection
    const User = mongoose.model('User_Login', new mongoose.Schema({
      name: String,
      email: String,
      password: String,
      createdAt: Date
    }), 'User_Login');

    const users = await User.find({});
    console.log(`Users in User_Login collection: ${users.length}`);
    if (users.length > 0) {
      console.log('\nUser data:');
      users.forEach(user => {
        console.log(`  - Name: ${user.name}`);
        console.log(`    Email: ${user.email}`);
        console.log(`    Created: ${user.createdAt}`);
        console.log('');
      });
    }

    await mongoose.connection.close();
    console.log('Connection closed');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkDatabase();
