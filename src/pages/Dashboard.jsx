import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Papa from 'papaparse'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import './Dashboard.css'

function Dashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [vitalsData, setVitalsData] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalRecords: 0,
    avgHeartRate: 0,
    criticalAlerts: 0
  })
  const [showAddModal, setShowAddModal] = useState(false)

  const deleteRecord = (index) => {
    const newData = vitalsData.filter((_, i) => i !== index)
    setVitalsData(newData)
    updateStats(newData)
  }

  const addRecord = (newRecord) => {
    const newData = [...vitalsData, newRecord]
    setVitalsData(newData)
    updateStats(newData)
    setShowAddModal(false)
  }

  const updateStats = (data) => {
    const uniquePatients = new Set(data.map(d => d.subject_id)).size
    const numericValues = data.filter(d => d.valuenum && !isNaN(d.valuenum))
    const avgValue = numericValues.length > 0 
      ? numericValues.reduce((sum, d) => sum + parseFloat(d.valuenum), 0) / numericValues.length 
      : 0
    
    setStats({
      totalPatients: uniquePatients,
      totalRecords: data.length,
      avgHeartRate: avgValue.toFixed(1),
      criticalAlerts: data.filter(d => d.warning === '1').length
    })
  }

  useEffect(() => {
    loadCSVData()
  }, [])

  const loadCSVData = async () => {
    try {
      const response = await fetch('/backend/chartevents.csv')
      const csvText = await response.text()
      
      Papa.parse(csvText, {
        header: true,
        complete: (results) => {
          const data = results.data.filter(row => row.subject_id)
          
          // Only load first 50 records for display
          const displayData = data.slice(0, 50)
          setVitalsData(displayData)
          
          // Calculate statistics from displayed data only
          updateStats(displayData)
          
          setLoading(false)
        }
      })
    } catch (error) {
      console.error('Error loading CSV:', error)
      setLoading(false)
    }
  }

  const handleLogout = () => {
    navigate('/login')
  }


  // Prepare chart data
  const getPatientDistribution = () => {
    const patientCounts = {}
    vitalsData.forEach(record => {
      patientCounts[record.subject_id] = (patientCounts[record.subject_id] || 0) + 1
    })
    return Object.entries(patientCounts).slice(0, 10).map(([id, count]) => ({
      patient: `P-${id.slice(-4)}`,
      records: count
    }))
  }

  const getValueDistribution = () => {
    const ranges = { 'Low': 0, 'Normal': 0, 'High': 0, 'Critical': 0 }
    vitalsData.forEach(record => {
      const val = parseFloat(record.valuenum)
      if (!isNaN(val)) {
        if (val < 50) ranges['Low']++
        else if (val < 100) ranges['Normal']++
        else if (val < 150) ranges['High']++
        else ranges['Critical']++
      }
    })
    return Object.entries(ranges).map(([name, value]) => ({ name, value }))
  }

  const getTimelineData = () => {
    const timeline = {}
    vitalsData.slice(0, 100).forEach(record => {
      if (record.charttime) {
        const hour = new Date(record.charttime).getHours()
        timeline[hour] = (timeline[hour] || 0) + 1
      }
    })
    return Object.entries(timeline).map(([hour, count]) => ({
      time: `${hour}:00`,
      readings: count
    }))
  }

  const getAlertTimelineData = () => {
    const timeline = {}
    const alerts = vitalsData.filter(r => r.warning === '1')
    alerts.forEach(record => {
      if (record.charttime) {
        const hour = new Date(record.charttime).getHours()
        timeline[hour] = (timeline[hour] || 0) + 1
      }
    })
    return Object.entries(timeline).map(([hour, count]) => ({
      time: `${hour}:00`,
      alerts: count
    }))
  }

  const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe']

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <p>Loading patient data...</p>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <svg viewBox="0 0 50 50" fill="none">
              <rect width="50" height="50" rx="10" fill="url(#gradient)"/>
              <path d="M25 15L25 35M15 25L35 25" stroke="white" strokeWidth="4" strokeLinecap="round"/>
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="50" y2="50">
                  <stop offset="0%" stopColor="#667eea"/>
                  <stop offset="100%" stopColor="#764ba2"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h2>MediCare</h2>
          <p className="subtitle">Patient Vitals Monitor</p>
        </div>

        
        <nav className="sidebar-nav">
          <button 
            className={activeTab === 'overview' ? 'active' : ''} 
            onClick={() => setActiveTab('overview')}
          >
            📊 Overview
          </button>
          <button 
            className={activeTab === 'patients' ? 'active' : ''} 
            onClick={() => setActiveTab('patients')}
          >
            👥 Patients
          </button>
          <button 
            className={activeTab === 'analytics' ? 'active' : ''} 
            onClick={() => setActiveTab('analytics')}
          >
            📈 Analytics
          </button>
          <button 
            className={activeTab === 'alerts' ? 'active' : ''} 
            onClick={() => setActiveTab('alerts')}
          >
            🔔 Alerts
          </button>
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          🚪 Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Top Navbar */}
        <nav className="top-navbar">
          <div className="navbar-left">
            <h1 className="navbar-title">Medical Dashboard</h1>
          </div>
          <div className="navbar-right">
            <div className="navbar-item notification">
              <span className="navbar-icon">�</span>
              <span className="badge">{stats.criticalAlerts}</span>
            </div>
          </div>
        </nav>

        {/* Content based on active tab */}
        {activeTab === 'overview' && (
          <div className="content-section">
            {/* Stats Cards */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-info">
                  <p className="stat-label">Total Patients</p>
                  <p className="stat-value">{stats.totalPatients}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📋</div>
                <div className="stat-info">
                  <p className="stat-label">Total Records</p>
                  <p className="stat-value">{stats.totalRecords.toLocaleString()}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">💓</div>
                <div className="stat-info">
                  <p className="stat-label">Avg Value</p>
                  <p className="stat-value">{stats.avgHeartRate}</p>
                </div>
              </div>
            </div>

            <div className="chart-grid">
              <div className="chart-card">
                <h3>Patient Records Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getPatientDistribution()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="patient" stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333' }} />
                    <Bar dataKey="records" fill="#667eea" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <h3>Value Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getValueDistribution()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getValueDistribution().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}


        {activeTab === 'patients' && (
          <div className="content-section">
            <div className="table-card">
              <div className="table-header">
                <h3>Recent Patient Records</h3>
                <button className="add-record-btn" onClick={() => setShowAddModal(true)}>
                  ➕ Add Record
                </button>
              </div>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Patient ID</th>
                      <th>Chart Time</th>
                      <th>Item ID</th>
                      <th>Value</th>
                      <th>Unit</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vitalsData.map((record, index) => (
                      <tr key={index}>
                        <td>P-{record.subject_id?.slice(-6)}</td>
                        <td>{new Date(record.charttime).toLocaleString()}</td>
                        <td>{record.itemid}</td>
                        <td>{record.valuenum || record.value}</td>
                        <td>{record.valueuom || '-'}</td>
                        <td>
                          <span className={`status-badge ${record.warning === '1' ? 'warning' : 'normal'}`}>
                            {record.warning === '1' ? 'Warning' : 'Normal'}
                          </span>
                        </td>
                        <td>
                          <button className="delete-row-btn" onClick={() => deleteRecord(index)}>
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Add Record Modal */}
            {showAddModal && (
              <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <h3>Add New Patient Record</h3>
                  <form onSubmit={(e) => {
                    e.preventDefault()
                    const formData = new FormData(e.target)
                    const newRecord = {
                      subject_id: formData.get('patientId'),
                      charttime: new Date().toISOString(),
                      itemid: formData.get('itemId'),
                      value: formData.get('value'),
                      valuenum: formData.get('value'),
                      valueuom: formData.get('unit'),
                      warning: formData.get('status') === 'warning' ? '1' : '0'
                    }
                    addRecord(newRecord)
                  }}>
                    <div className="form-group">
                      <label>Patient ID</label>
                      <input type="text" name="patientId" required placeholder="e.g., 10005817" />
                    </div>
                    <div className="form-group">
                      <label>Item ID</label>
                      <input type="text" name="itemId" required placeholder="e.g., 225054" />
                    </div>
                    <div className="form-group">
                      <label>Value</label>
                      <input type="text" name="value" required placeholder="e.g., 100" />
                    </div>
                    <div className="form-group">
                      <label>Unit</label>
                      <input type="text" name="unit" placeholder="e.g., %, bpm" />
                    </div>
                    <div className="form-group">
                      <label>Status</label>
                      <select name="status">
                        <option value="normal">Normal</option>
                        <option value="warning">Warning</option>
                      </select>
                    </div>
                    <div className="modal-actions">
                      <button type="button" className="cancel-btn" onClick={() => setShowAddModal(false)}>
                        Cancel
                      </button>
                      <button type="submit" className="submit-btn">
                        Add Record
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="content-section">
            <div className="chart-card full-width">
              <h3>Readings Timeline</h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={getTimelineData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="time" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333' }} />
                  <Legend />
                  <Line type="monotone" dataKey="readings" stroke="#667eea" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}


        {activeTab === 'alerts' && (
          <div className="content-section">
            {/* Critical Alerts Summary Card */}
            <div className="alert-summary-card">
              <div className="alert-summary-icon">⚠️</div>
              <div className="alert-summary-content">
                <p className="alert-summary-label">Critical Alerts</p>
                <p className="alert-summary-value">{stats.criticalAlerts}</p>
              </div>
            </div>

            {/* Alerts Chart */}
            <div className="chart-card full-width">
              <h3>Alert Trends Over Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getAlertTimelineData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="time" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333' }} />
                  <Legend />
                  <Bar dataKey="alerts" fill="#ff4444" name="Alert Count" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Alerts List */}
            <div className="alerts-container">
              <h3>Recent Critical Alerts</h3>
              {vitalsData.filter(r => r.warning === '1').slice(0, 20).map((record, index) => (
                <div key={index} className="alert-item">
                  <div className="alert-icon">⚠️</div>
                  <div className="alert-content">
                    <p className="alert-title">Patient P-{record.subject_id?.slice(-6)}</p>
                    <p className="alert-desc">
                      Item {record.itemid}: {record.value || record.valuenum} {record.valueuom}
                    </p>
                    <p className="alert-time">{new Date(record.charttime).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default Dashboard
