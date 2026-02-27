import { useState, useEffect } from 'react'
import { MdWarning, MdTrendingUp, MdTrendingDown } from 'react-icons/md'
import { FiActivity, FiAlertTriangle } from 'react-icons/fi'
import './AIPredictions.css'

function AIPredictions({ vitalsData, patients, selectedPatient }) {
  const [predictions, setPredictions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (vitalsData.length > 0) {
      // Re-analyze when vitalsData changes or selectedPatient changes
      analyzePatientsForRisk()
    }
  }, [vitalsData.length, selectedPatient])

  const analyzePatientsForRisk = async () => {
    setLoading(true)
    try {
      // Only analyze the selected patient
      const patientRecords = vitalsData.filter(record => 
        record.patientId === selectedPatient
      )

      if (patientRecords.length === 0) {
        console.log('No records found for selected patient')
        setLoading(false)
        return
      }

      // Sort by timestamp
      const sortedRecords = patientRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      const recentRecords = sortedRecords.slice(0, 20) // Last 20 readings

      // Calculate trends
      const hrTrend = calculateTrend(recentRecords.map(r => r.heartRate))
      const spo2Trend = calculateTrend(recentRecords.map(r => r.spO2))
      const mapTrend = calculateTrend(recentRecords.map(r => r.meanArterialPressure || 80))

      // Detect anomalies
      const hrVariability = calculateVariability(recentRecords.map(r => r.heartRate))
      const spo2Variability = calculateVariability(recentRecords.map(r => r.spO2))

      // Get AI prediction
      const aiPrediction = await getAIPrediction(selectedPatient, recentRecords, {
        hrTrend,
        spo2Trend,
        mapTrend,
        hrVariability,
        spo2Variability
      })

      if (aiPrediction) {
        setPredictions([aiPrediction])
      } else {
        setPredictions([])
      }
    } catch (error) {
      console.error('Error analyzing patient:', error)
      setPredictions([])
    } finally {
      setLoading(false)
    }
  }

  const calculateTrend = (values) => {
    if (values.length < 2) return 0
    const recent = values.slice(0, Math.floor(values.length / 2))
    const older = values.slice(Math.floor(values.length / 2))
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length
    return ((recentAvg - olderAvg) / olderAvg) * 100
  }

  const calculateVariability = (values) => {
    if (values.length < 2) return 0
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    return Math.sqrt(variance)
  }

  const getAIPrediction = async (patientId, records, trends) => {
    try {
      const latest = records[0]
      const avgHR = records.reduce((sum, r) => sum + r.heartRate, 0) / records.length
      const avgSpO2 = records.reduce((sum, r) => sum + r.spO2, 0) / records.length
      const highRiskCount = records.filter(r => r.predictedEvent === 'High Risk').length

      const context = {
        patientId,
        recordCount: records.length,
        latestVitals: {
          heartRate: latest.heartRate,
          spO2: latest.spO2,
          map: latest.meanArterialPressure,
          timestamp: latest.timestamp
        },
        averages: {
          heartRate: avgHR.toFixed(1),
          spO2: avgSpO2.toFixed(1)
        },
        trends: {
          heartRateTrend: trends.hrTrend.toFixed(1) + '%',
          spO2Trend: trends.spo2Trend.toFixed(1) + '%',
          mapTrend: trends.mapTrend.toFixed(1) + '%'
        },
        variability: {
          heartRate: trends.hrVariability.toFixed(1),
          spO2: trends.spo2Variability.toFixed(1)
        },
        highRiskPercentage: ((highRiskCount / records.length) * 100).toFixed(1) + '%'
      }

      console.log(`Requesting AI prediction for patient ${patientId}...`)

      const response = await fetch('http://localhost:3000/api/ai/predict-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientData: context })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`AI prediction failed for patient ${patientId}:`, response.status, errorText)
        
        // If rate limited, return null to skip this patient
        if (response.status === 429 || errorText.includes('Too Many Requests')) {
          console.warn(`Rate limited for patient ${patientId}, skipping...`)
          return null
        }
        
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      console.log(`AI prediction received for patient ${patientId}:`, data.riskLevel)
      
      return {
        patientId,
        riskLevel: data.riskLevel || 'unknown',
        prediction: data.prediction || 'No prediction available',
        concerns: data.concerns || [],
        recommendations: data.recommendations || [],
        latestVitals: latest,
        trends
      }
    } catch (error) {
      console.error(`Error getting AI prediction for patient ${patientId}:`, error)
      return null
    }
  }

  const getRiskColor = (riskLevel) => {
    switch (riskLevel.toLowerCase()) {
      case 'critical': return '#ff0000'
      case 'high': return '#ff4444'
      case 'moderate': return '#ff9800'
      case 'low': return '#10b981'
      default: return '#6b7280'
    }
  }

  const getRiskIcon = (riskLevel) => {
    switch (riskLevel.toLowerCase()) {
      case 'critical':
      case 'high':
        return <MdWarning size={24} />
      case 'moderate':
        return <FiAlertTriangle size={24} />
      default:
        return <FiActivity size={24} />
    }
  }

  return (
    <div className="ai-predictions-container">
      <div className="ai-predictions-header">
        <FiActivity size={28} color="#8b7fc7" />
        <div style={{ flex: 1 }}>
          <h3>AI Continuous Monitoring & Risk Predictions</h3>
          <p>Real-time analysis of subtle changes indicating future cardiac risk</p>
        </div>
        <button 
          onClick={analyzePatientsForRisk}
          disabled={loading}
          style={{
            padding: '10px 20px',
            background: loading ? '#9d96bb' : '#8b7fc7',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FiActivity size={16} />
          {loading ? 'Analyzing...' : 'Analyze Now'}
        </button>
      </div>

      {loading && (
        <div className="ai-predictions-loading">
          <div className="loader"></div>
          <p>AI is analyzing patient data for risk patterns... (This may take 10-20 seconds)</p>
        </div>
      )}

      {!loading && predictions.length === 0 && (
        <div className="ai-predictions-loading">
          <FiActivity size={48} color="#8b7fc7" />
          <p>No predictions available. Click "Analyze Now" to start AI analysis.</p>
        </div>
      )}

      {!loading && predictions.length > 0 && (
        <div className="predictions-grid">
          {predictions.map((pred) => (
          <div 
            key={pred.patientId} 
            className="prediction-card"
            style={{ borderLeft: `4px solid ${getRiskColor(pred.riskLevel)}` }}
          >
            <div className="prediction-header">
              <div className="patient-info">
                <span className="patient-id">{pred.patientId}</span>
                <span 
                  className="risk-badge"
                  style={{ background: getRiskColor(pred.riskLevel) }}
                >
                  {getRiskIcon(pred.riskLevel)}
                  {pred.riskLevel.toUpperCase()} RISK
                </span>
              </div>
            </div>

            <div className="prediction-content">
              <div className="prediction-text">
                <strong>AI Prediction:</strong>
                <p>{pred.prediction}</p>
              </div>

              <div className="vitals-summary">
                <div className="vital-item">
                  <span className="vital-label">Heart Rate:</span>
                  <span className="vital-value">
                    {pred.latestVitals.heartRate} bpm
                    {pred.trends.hrTrend > 5 && <MdTrendingUp color="#ff4444" />}
                    {pred.trends.hrTrend < -5 && <MdTrendingDown color="#10b981" />}
                  </span>
                </div>
                <div className="vital-item">
                  <span className="vital-label">SpO2:</span>
                  <span className="vital-value">
                    {pred.latestVitals.spO2}%
                    {pred.trends.spo2Trend < -3 && <MdTrendingDown color="#ff4444" />}
                    {pred.trends.spo2Trend > 3 && <MdTrendingUp color="#10b981" />}
                  </span>
                </div>
              </div>

              {pred.concerns && pred.concerns.length > 0 && (
                <div className="concerns-section">
                  <strong>⚠️ Concerns Detected:</strong>
                  <ul>
                    {pred.concerns.map((concern, idx) => (
                      <li key={idx}>{concern}</li>
                    ))}
                  </ul>
                </div>
              )}

              {pred.recommendations && pred.recommendations.length > 0 && (
                <div className="recommendations-section">
                  <strong>💡 Recommendations:</strong>
                  <ul>
                    {pred.recommendations.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  )
}

export default AIPredictions
