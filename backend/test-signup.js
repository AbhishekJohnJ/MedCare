const axios = require('axios');

async function testSignup() {
  try {
    const response = await axios.post('http://localhost:3000/api/auth/signup', {
      name: 'Test User',
      email: 'testuser@example.com',
      password: 'test1234'
    });
    console.log('✅ Signup successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('❌ Signup failed!');
    console.log('Error:', error.response?.data || error.message);
  }
}

testSignup();
