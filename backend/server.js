const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const jwt = require('jsonwebtoken');
const PatientVital = require('./PatientVital');
const User = require('./User');

// Load environment variables from root .env file
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/your_database_name';
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB successfully');
    
    // Create indexes for better performance with large datasets
    PatientVital.collection.createIndex({ timestamp: -1 });
    PatientVital.collection.createIndex({ patientId: 1 });
    PatientVital.collection.createIndex({ predictedEvent: 1 });
    console.log('Database indexes created');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Server is running' });
});

// ============ AUTH ROUTES ============

// Signup route
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create new user
    const user = new User({ name, email, password });
    await user.save();

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error during signup' });
  }
});

// Login route
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// ============ VITALS ROUTES ============

// Risk assessment logic function
function assessRisk(heartRate, spO2) {
  if (heartRate > 100 || spO2 < 90) {
    return {
      riskScore: 0.8,
      predictedEvent: 'High Risk'
    };
  }
  return {
    riskScore: 0.2,
    predictedEvent: 'Low Risk'
  };
}

// POST route to save patient vitals
app.post('/api/vitals', async (req, res) => {
  try {
    const { heartRate, spO2 } = req.body;
    
    // Calculate risk assessment
    const riskAssessment = assessRisk(heartRate, spO2);
    
    // Create vital record with risk assessment
    const vital = new PatientVital({
      ...req.body,
      ...riskAssessment
    });
    
    await vital.save();
    res.status(201).json(vital);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET route to retrieve all patient vitals with pagination
app.get('/api/vitals', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;
    const patientId = req.query.patientId; // Filter by patient ID
    
    const query = patientId ? { patientId } : {};
    
    const [vitals, totalCount] = await Promise.all([
      PatientVital.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PatientVital.countDocuments(query)
    ]);
    
    res.json({
      data: vitals,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalRecords: totalCount,
        recordsPerPage: limit,
        hasNextPage: skip + vitals.length < totalCount,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET route to retrieve all unique patient IDs
app.get('/api/patients', async (req, res) => {
  try {
    const patients = await PatientVital.distinct('patientId');
    const patientList = patients.filter(p => p !== null).map(id => ({
      id,
      label: id
    }));
    res.json(patientList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET route to retrieve statistics
app.get('/api/stats', async (req, res) => {
  try {
    const patientId = req.query.patientId;
    const query = patientId ? { patientId } : {};
    
    const [totalRecords, uniquePatients, avgHeartRate, criticalAlerts] = await Promise.all([
      PatientVital.countDocuments(query),
      patientId ? Promise.resolve(1) : PatientVital.distinct('patientId').then(p => p.filter(id => id !== null).length),
      PatientVital.aggregate([
        { $match: query },
        { $group: { _id: null, avgHR: { $avg: '$heartRate' } } }
      ]).then(result => result[0]?.avgHR || 0),
      PatientVital.countDocuments({ ...query, predictedEvent: 'High Risk' })
    ]);
    
    res.json({
      totalPatients: uniquePatients,
      totalRecords,
      avgHeartRate: avgHeartRate.toFixed(1),
      criticalAlerts
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET route to retrieve ALL patient vitals (no limit)
app.get('/api/vitals/all', async (req, res) => {
  try {
    const vitals = await PatientVital.find()
      .sort({ timestamp: -1 });
    res.json(vitals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET route to retrieve patient vitals by patientId
app.get('/api/vitals/:patientId', async (req, res) => {
  try {
    const vitals = await PatientVital.find({ patientId: req.params.patientId })
      .sort({ timestamp: -1 });
    res.json(vitals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
