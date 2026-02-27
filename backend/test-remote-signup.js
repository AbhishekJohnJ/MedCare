const axios = require('axios');

async function testSignup() {
  try {
    console.log('Testing signup to remote MongoDB...\n');
    
    const response = await axios.post('http://localhost:3000/api/auth/signup', {
      name: 'Abhishek John J',
      email: 'abhishekjohnj411@gmail.com',
      password: 'test12345'
    });
    
    console.log('✅ Signup successful!');
    console.log('User created:', response.data.user);
    console.log('\nNow check MongoDB Compass at:');
    console.log('Connection: mongodb://10.21.221.151:27017');
    console.log('Database: AurelionDB');
    console.log('Collection: User_Login');
  } catch (error) {
    if (error.response?.data?.error === 'Email already registered') {
      console.log('✅ User already exists in database!');
      console.log('Email:', 'abhishekjohnj411@gmail.com');
      console.log('\nCheck MongoDB Compass at:');
      console.log('Connection: mongodb://10.21.221.151:27017');
      console.log('Database: AurelionDB');
      console.log('Collection: User_Login');
    } else {
      console.log('❌ Signup failed!');
      console.log('Error:', error.response?.data || error.message);
    }
  }
}

testSignup();
