import { useState, useEffect } from 'react'
import { MdWarning, MdCheckCircle } from 'react-icons/md'
import { FiBell, FiCheck } from 'react-icons/fi'
import './AlertHistoryTab.css'

function AlertHistoryTab() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all', 'unacknowledged', 'acknowledged'

  useEffect(() => {
    fetchAlerts()
  }, [filter])

  const fetchAlerts = async () => {
    setLoading(true)
    try {
      let url = 'http://localhost:3000/api/alerts/history'
      if (filter === 'unacknowledged') {
        url += '?acknowledged=false'
      } else if (filter === 'acknowledged') {
        url += '?acknowledged=true'
      }

      const response = await fetch(url)
      const data = await response.json()
      setAlerts(data)
    } catch (error) {
      console.error('Error fetching alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const acknowledgeAlert = async (id) => {
    try {
      await fetch(`http://localhost:3000/api/alerts/${id}/acknowledge`, {
        method: 'POST'
      })
      fetchAlerts()
    } catch (error) {
      console.error('Error acknowledging alert:', error)
    }
  }

  const acknowledgeAll = async () => {
    try {
      await fetch('http://localhost:3000/api/alerts/acknowledge-all', {
        method: 'POST'
      })
      fetchAlerts()
    } catch (error) {
      console.error('Error acknowledging all alerts:', error)
    }
  }

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'CRITICAL': return '#ff0000'
      case 'HIGH': return '#ff4444'
      case 'MODERATE': return '#ff9800'
      case 'LOW': return '#10b981'
      default: return '#6b7280'
    }
  }

  if (loading) {
    return (
      <div className="alert-history-loading">
        <div className="loader"></div>
        <p>Loading alert history...</p>
      </div>
    )
  }

  return (
    <div className="alert-history-container">
      <div className="alert-history-header">
        <div>
          <h2>Alert History</h2>
          <p>All AI-detected high-risk patient alerts</p>
        </div>
        <div className="alert-history-actions">
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Alerts</option>
            <option value="unacknowledged">Unacknowledged</option>
            <option value="acknowledged">Acknowledged</option>
          </select>
          {alerts.filter(a => !a.acknowledged).length > 0 && (
            <button onClick={acknowledgeAll} className="acknowledge-all-btn">
              <FiCheck size={16} />
              Acknowledge All
            </button>
          )}
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="no-alerts">
          <FiBell size={48} color="#9d96bb" />
          <p>No alerts found</p>
        </div>
      ) : (
        <div className="alerts-list">
          {alerts.map((alert) => (
            <div 
              key={alert._id} 
              className={`alert-history-card ${alert.acknowledged ? 'acknowledged' : 'unacknowledged'}`}
              style={{ borderLeft: `4px solid ${getRiskColor(alert.riskLevel)}` }}
            >
              <div className="alert-card-header">
                <div className="alert-card-info">
                  <span className="alert-patient-id">{alert.patientId}</span>
                  <span 
                    className="alert-risk-badge"
                    style={{ background: getRiskColor(alert.riskLevel) }}
                  >
                    <MdWarning size={14} />
                    {alert.riskLevel}
                  </span>
                  {alert.acknowledged && (
                    <span className="acknowledged-badge">
                      <MdCheckCircle size={14} />
                      Acknowledged
                    </span>
                  )}
                </div>
                <div className="alert-card-time">
                  {new Date(alert.createdAt).toLocaleString()}
                </div>
              </div>

              <div className="alert-card-body">
                {alert.prediction && (
                  <div className="alert-prediction">
                    <strong>Prediction:</strong>
                    <p>{alert.prediction}</p>
                  </div>
                )}

                <div className="alert-vitals">
                  <div className="vital-badge">
                    <span className="vital-label">HR:</span>
                    <span className="vital-value">{alert.vitals.heartRate} bpm</span>
                  </div>
                  <div className="vital-badge">
                    <span className="vital-label">SpO2:</span>
                    <span className="vital-value">{alert.vitals.spO2}%</span>
                  </div>
                  <div className="vital-badge">
                    <span className="vital-label">MAP:</span>
                    <span className="vital-value">{alert.vitals.meanArterialPressure || '—'} mmHg</span>
                  </div>
                </div>

                {alert.concerns && alert.concerns.length > 0 && (
                  <div className="alert-concerns">
                    <strong>⚠ Concerns:</strong>
                    <ul>{alert.concerns.map((c, i) => <li key={i}>{c}</li>)}</ul>
                  </div>
                )}

                {alert.recommendations && alert.recommendations.length > 0 && (
                  <div className="alert-recommendations">
                    <strong>💡 Recommendations:</strong>
                    <ul>{alert.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>
                  </div>
                )}
              </div>

              {!alert.acknowledged && (
                <div className="alert-card-footer">
                  <button 
                    onClick={() => acknowledgeAlert(alert._id)}
                    className="acknowledge-btn"
                  >
                    <FiCheck size={16} />
                    Acknowledge Alert
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AlertHistoryTab
