import { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function App() {
  const [vitalsData, setVitalsData] = useState([]);
  const [latestVital, setLatestVital] = useState(null);
  const [loading, setLoading] = useState(true);

  const PATIENT_ID = 'patient_001';
  const API_URL = `http://localhost:3000/api/vitals/${PATIENT_ID}`;

  // Fetch data from API
  const fetchVitals = async () => {
    try {
      const response = await axios.get(API_URL);
      const data = response.data;
      
      if (data && data.length > 0) {
        setLatestVital(data[0]);
        
        // Format data for chart (last 20 readings)
        const chartData = data.slice(0, 20).reverse().map((vital, index) => ({
          time: new Date(vital.timestamp).toLocaleTimeString(),
          heartRate: vital.heartRate,
          spO2: vital.spO2,
          map: vital.meanArterialPressure,
          riskScore: vital.riskScore
        }));
        
        setVitalsData(chartData);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching vitals:', error);
      setLoading(false);
    }
  };

  // Fetch data on mount and every 5 seconds
  useEffect(() => {
    fetchVitals();
    const interval = setInterval(fetchVitals, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const isHighRisk = latestVital?.riskScore >= 0.8;

  return (
    <div className="min-h-screen bg-gradient-to-br from-aurelion-darker via-aurelion-dark to-aurelion-blue p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            AURELION <span className="text-aurelion-cyan">HEALTH</span>
          </h1>
          <p className="text-gray-400">Real-time Patient Monitoring Dashboard</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-white text-xl">Loading patient data...</div>
          </div>
        ) : (
          <>
            {/* Risk Status Badge */}
            <div className="mb-8">
              <div className={`inline-block px-8 py-4 rounded-lg shadow-2xl border-2 ${
                isHighRisk 
                  ? 'bg-red-900/50 border-red-500 animate-pulse' 
                  : 'bg-green-900/50 border-green-500'
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`w-4 h-4 rounded-full ${
                    isHighRisk ? 'bg-red-500' : 'bg-green-500'
                  }`}></div>
                  <div>
                    <p className="text-gray-300 text-sm">Risk Status</p>
                    <p className={`text-3xl font-bold ${
                      isHighRisk ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {latestVital?.predictedEvent || 'Normal'}
                    </p>
                  </div>
                  <div className="ml-8">
                    <p className="text-gray-300 text-sm">Risk Score</p>
                    <p className="text-2xl font-bold text-white">
                      {(latestVital?.riskScore * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Vital Signs Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-aurelion-dark/80 backdrop-blur-sm rounded-lg p-6 border border-aurelion-cyan/30 shadow-xl">
                <p className="text-gray-400 text-sm mb-2">Heart Rate</p>
                <p className="text-4xl font-bold text-aurelion-cyan mb-1">
                  {latestVital?.heartRate || '--'}
                </p>
                <p className="text-gray-500 text-sm">BPM</p>
              </div>

              <div className="bg-aurelion-dark/80 backdrop-blur-sm rounded-lg p-6 border border-blue-500/30 shadow-xl">
                <p className="text-gray-400 text-sm mb-2">SpO2</p>
                <p className="text-4xl font-bold text-blue-400 mb-1">
                  {latestVital?.spO2 || '--'}
                </p>
                <p className="text-gray-500 text-sm">%</p>
              </div>

              <div className="bg-aurelion-dark/80 backdrop-blur-sm rounded-lg p-6 border border-purple-500/30 shadow-xl">
                <p className="text-gray-400 text-sm mb-2">Mean Arterial Pressure</p>
                <p className="text-4xl font-bold text-purple-400 mb-1">
                  {latestVital?.meanArterialPressure || '--'}
                </p>
                <p className="text-gray-500 text-sm">mmHg</p>
              </div>
            </div>

            {/* Heart Rate Chart */}
            <div className="bg-aurelion-dark/80 backdrop-blur-sm rounded-lg p-6 border border-gray-700 shadow-xl">
              <h2 className="text-2xl font-bold text-white mb-4">
                Live Heart Rate Monitor
              </h2>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={vitalsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="time" 
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="heartRate" 
                    stroke="#06b6d4" 
                    strokeWidth={3}
                    dot={{ fill: '#06b6d4', r: 4 }}
                    name="Heart Rate (BPM)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Patient Info */}
            <div className="mt-8 bg-aurelion-dark/80 backdrop-blur-sm rounded-lg p-6 border border-gray-700 shadow-xl">
              <h3 className="text-xl font-bold text-white mb-4">Patient Information</h3>
              <div className="grid grid-cols-2 gap-4 text-gray-300">
                <div>
                  <p className="text-gray-500 text-sm">Patient ID</p>
                  <p className="font-mono">{PATIENT_ID}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Last Updated</p>
                  <p>{latestVital ? new Date(latestVital.timestamp).toLocaleString() : '--'}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
