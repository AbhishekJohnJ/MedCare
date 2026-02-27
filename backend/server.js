const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const PatientVital = require('./PatientVital');
const User = require('./User');
const AlertHistory = require('./AlertHistory');

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

// ============ AI CHAT ROUTES ============

// POST route for AI chat
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, context } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const FEATHERLESS_API_KEY = process.env.FEATHERLESS_API_KEY || 'rc_9984ee6b5690248a5ad167873c38cefea004c1614efec9c9bb8dfe434a58dc03';

    const systemPrompt = `You are an AI medical assistant analyzing patient vital signs data. You help healthcare professionals understand patient conditions, predict high-risk cases, and provide insights.

Key Guidelines:
- Analyze heart rate (normal: 60-100 bpm), SpO2 (normal: 95-100%), and MAP (normal: 70-100 mmHg)
- High risk is defined as: Heart Rate > 100 bpm OR SpO2 < 90%
- Provide clear, concise medical insights
- Highlight urgent cases that need immediate attention
- Use the provided patient data context to give accurate answers
- Be professional and empathetic

${context ? 'Current Patient Data:\n' + context : ''}`;

    const response = await fetch('https://api.featherless.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FEATHERLESS_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`Featherless API error: ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';

    res.json({ response: aiResponse });
  } catch (error) {
    console.error('AI Chat error:', error);
    res.status(500).json({ error: 'Failed to get AI response', details: error.message });
  }
});

// POST route for AI risk prediction
app.post('/api/ai/predict-risk', async (req, res) => {
  try {
    const { patientData } = req.body;

    if (!patientData) {
      return res.status(400).json({ error: 'Patient data is required' });
    }

    const FEATHERLESS_API_KEY = process.env.FEATHERLESS_API_KEY || 'rc_9984ee6b5690248a5ad167873c38cefea004c1614efec9c9bb8dfe434a58dc03';

    const systemPrompt = `You are an AI cardiac risk assessment specialist. Analyze patient vital signs data to predict future heart risk based on subtle changes and trends.

Your task:
1. Analyze the patient's vital signs trends (heart rate, SpO2, MAP)
2. Identify subtle changes that might indicate future cardiac risk
3. Assess variability in vital signs (high variability can indicate instability)
4. Provide a risk level: CRITICAL, HIGH, MODERATE, or LOW
5. List specific concerns detected
6. Provide actionable recommendations

Patient Data:
${JSON.stringify(patientData, null, 2)}

Respond in JSON format:
{
  "riskLevel": "HIGH|MODERATE|LOW|CRITICAL",
  "prediction": "Brief prediction summary (1-2 sentences)",
  "concerns": ["concern1", "concern2"],
  "recommendations": ["recommendation1", "recommendation2"]
}`;

    const response = await fetch('https://api.featherless.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FEATHERLESS_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Analyze this patient data and provide risk assessment.' }
        ],
        max_tokens: 400,
        temperature: 0.5
      })
    });

    if (!response.ok) {
      throw new Error(`Featherless API error: ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || '{}';

    // Try to parse JSON response
    let result;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback if AI doesn't return JSON
        result = {
          riskLevel: 'MODERATE',
          prediction: aiResponse.substring(0, 200),
          concerns: ['Unable to parse detailed analysis'],
          recommendations: ['Continue monitoring vital signs']
        };
      }
    } catch (parseError) {
      result = {
        riskLevel: 'MODERATE',
        prediction: aiResponse.substring(0, 200),
        concerns: ['Analysis in progress'],
        recommendations: ['Continue monitoring']
      };
    }

    // Save to alert history if HIGH or CRITICAL
    if (result.riskLevel === 'HIGH' || result.riskLevel === 'CRITICAL') {
      const alert = new AlertHistory({
        patientId: patientData.patientId,
        riskLevel: result.riskLevel,
        prediction: result.prediction,
        concerns: result.concerns || [],
        recommendations: result.recommendations || [],
        vitals: patientData.latestVitals,
        trends: {
          hrTrend: parseFloat(patientData.trends.heartRateTrend),
          spo2Trend: parseFloat(patientData.trends.spO2Trend),
          mapTrend: parseFloat(patientData.trends.mapTrend),
          hrVariability: parseFloat(patientData.variability.heartRate),
          spo2Variability: parseFloat(patientData.variability.spO2)
        }
      });
      await alert.save();
    }

    res.json(result);
  } catch (error) {
    console.error('AI Prediction error:', error);
    res.status(500).json({ error: 'Failed to get AI prediction', details: error.message });
  }
});

// ============ ALERT HISTORY ROUTES ============

// GET all alert history
app.get('/api/alerts/history', async (req, res) => {
  try {
    const { patientId, acknowledged } = req.query;
    const query = {};
    
    if (patientId) query.patientId = patientId;
    if (acknowledged !== undefined) query.acknowledged = acknowledged === 'true';
    
    const alerts = await AlertHistory.find(query)
      .sort({ createdAt: -1 })
      .limit(100);
    
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET unacknowledged alerts count
app.get('/api/alerts/unacknowledged-count', async (req, res) => {
  try {
    const count = await AlertHistory.countDocuments({ acknowledged: false });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST acknowledge alert
app.post('/api/alerts/:id/acknowledge', async (req, res) => {
  try {
    const alert = await AlertHistory.findByIdAndUpdate(
      req.params.id,
      { acknowledged: true, acknowledgedAt: new Date() },
      { new: true }
    );
    res.json(alert);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST acknowledge all alerts
app.post('/api/alerts/acknowledge-all', async (req, res) => {
  try {
    const result = await AlertHistory.updateMany(
      { acknowledged: false },
      { acknowledged: true, acknowledgedAt: new Date() }
    );
    res.json({ modifiedCount: result.modifiedCount });
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
