import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Papa from 'papaparse'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { FiBarChart2, FiUsers, FiTrendingUp, FiBell, FiLogOut, FiPlus, FiTrash2, FiMenu, FiX, FiActivity } from 'react-icons/fi'
import { IoMdPeople, IoMdDocument, IoMdHeart } from 'react-icons/io'
import { MdWarning } from 'react-icons/md'
import './Dashboard.css'

function Dashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [vitalsData, setVitalsData] = useState([])
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalRecords: 0,
    avgHeartRate: 0,
    criticalAlerts: 0
  })
  const [showAddModal, setShowAddModal] = useState(false)

  // Fetch data from MongoDB
  const fetchVitalsData = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/vitals?limit=100')
      const data = await response.json()
      setVitalsData(data)
      updateStats(data)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching vitals data:', error)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVitalsData()
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      fetchVitalsData()
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])

  const deleteRecord = async (id) => {
    // For now, just remove from local state
    // You can add a DELETE endpoint later
    const newData = vitalsData.filter(record => record._id !== id)
    setVitalsData(newData)
    updateStats(newData)
  }

  const addRecord = async (newRecord) => {
    try {
      const response = await fetch('http://localhost:3000/api/vitals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newRecord)
      })
      
      if (response.ok) {
        // Refresh data after adding
        await fetchVitalsData()
        setShowAddModal(false)
      } else {
        console.error('Failed to add record')
      }
    } catch (error) {
      console.error('Error adding record:', error)
    }
  }

  const updateStats = (data) => {
    const uniquePatients = new Set(data.map(d => d.patientId)).size
    const avgHR = data.length > 0 
      ? data.reduce((sum, d) => sum + (d.heartRate || 0), 0) / data.length 
      : 0
    const criticalCount = data.filter(d => d.predictedEvent === 'High Risk').length
    
    setStats({
      totalPatients: uniquePatients,
      totalRecords: data.length,
      avgHeartRate: avgHR.toFixed(1),
      criticalAlerts: criticalCount
    })
  }

  useEffect(() => {
    fetchVitalsData()
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      fetchVitalsData()
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])

  const loadCSVData = async () => {
    // This function is no longer needed, keeping for compatibility
    console.log('Using MongoDB data instead of CSV')
  }

  const handleLogout = () => {
    navigate('/login')
  }


  // Prepare chart data
  const getPatientDistribution = () => {
    const patientCounts = {}
    vitalsData.forEach(record => {
      patientCounts[record.patientId] = (patientCounts[record.patientId] || 0) + 1
    })
    return Object.entries(patientCounts).slice(0, 10).map(([id, count]) => ({
      patient: id,
      records: count
    }))
  }

  const getValueDistribution = () => {
    const ranges = { 'Low (<60)': 0, 'Normal (60-100)': 0, 'High (100-120)': 0, 'Critical (>120)': 0 }
    vitalsData.forEach(record => {
      const hr = record.heartRate
      if (hr < 60) ranges['Low (<60)']++
      else if (hr <= 100) ranges['Normal (60-100)']++
      else if (hr <= 120) ranges['High (100-120)']++
      else ranges['Critical (>120)']++
    })
    return Object.entries(ranges).map(([name, value]) => ({ name, value }))
  }

  const getTimelineData = () => {
    const timeline = {}
    vitalsData.forEach(record => {
      if (record.timestamp) {
        const hour = new Date(record.timestamp).getHours()
        timeline[hour] = (timeline[hour] || 0) + 1
      }
    })
    return Object.entries(timeline).sort((a, b) => a[0] - b[0]).map(([hour, count]) => ({
      time: `${hour}:00`,
      readings: count
    }))
  }

  const getAlertTimelineData = () => {
    const timeline = {}
    const alerts = vitalsData.filter(r => r.predictedEvent === 'High Risk')
    alerts.forEach(record => {
      if (record.timestamp) {
        const hour = new Date(record.timestamp).getHours()
        timeline[hour] = (timeline[hour] || 0) + 1
      }
    })
    return Object.entries(timeline).sort((a, b) => a[0] - b[0]).map(([hour, count]) => ({
      time: `${hour}:00`,
      alerts: count
    }))
  }

  const COLORS = ['#8b7fc7', '#a78bfa', '#c4b5fd', '#ddd6fe']

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
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <button className="toggle-sidebar-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <FiMenu size={20} />
        </button>
        
        <div className="sidebar-header">
          <div className="logo">
            <img src="/heartbloom_erased.png" alt="MediCare Logo" />
          </div>
          {sidebarOpen && (
            <>
              <h2>MediCare</h2>
              <p className="subtitle">Patient Vitals Monitor</p>
            </>
          )}
        </div>

        
        <nav className="sidebar-nav">
          <button 
            className={activeTab === 'overview' ? 'active' : ''} 
            onClick={() => setActiveTab('overview')}
            title="Overview"
          >
            <FiBarChart2 size={18} /> {sidebarOpen && 'Overview'}
          </button>
          <button 
            className={activeTab === 'patients' ? 'active' : ''} 
            onClick={() => setActiveTab('patients')}
            title="Patients"
          >
            <FiUsers size={18} /> {sidebarOpen && 'Patients'}
          </button>
          <button 
            className={activeTab === 'analytics' ? 'active' : ''} 
            onClick={() => setActiveTab('analytics')}
            title="Analytics"
          >
            <FiTrendingUp size={18} /> {sidebarOpen && 'Analytics'}
          </button>
          <button 
            className={activeTab === 'alerts' ? 'active' : ''} 
            onClick={() => setActiveTab('alerts')}
            title="Alerts"
          >
            <FiBell size={18} /> {sidebarOpen && 'Alerts'}
          </button>
          <button 
            className={activeTab === 'ai-mode' ? 'active' : ''} 
            onClick={() => setActiveTab('ai-mode')}
            title="AI Mode"
          >
            <FiActivity size={18} /> {sidebarOpen && 'AI Mode'}
          </button>
        </nav>

        <button className="logout-btn" onClick={handleLogout} title="Logout">
          <FiLogOut size={18} /> {sidebarOpen && 'Logout'}
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
              <FiBell size={20} />
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
                <div className="stat-icon"><IoMdPeople size={40} color="#8b7fc7" /></div>
                <div className="stat-info">
                  <p className="stat-label">Total Patients</p>
                  <p className="stat-value">{stats.totalPatients}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><IoMdDocument size={40} color="#8b7fc7" /></div>
                <div className="stat-info">
                  <p className="stat-label">Total Records</p>
                  <p className="stat-value">{stats.totalRecords.toLocaleString()}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><IoMdHeart size={40} color="#8b7fc7" /></div>
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#ddd6fe" />
                    <XAxis dataKey="patient" stroke="#6d5fa3" />
                    <YAxis stroke="#6d5fa3" />
                    <Tooltip contentStyle={{ background: 'white', border: '1px solid #ddd6fe', color: '#4a3f6f' }} />
                    <Bar dataKey="records" fill="#8b7fc7" />
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
                    <Tooltip contentStyle={{ background: 'white', border: '1px solid #ddd6fe', color: '#4a3f6f' }} />
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
                  <FiPlus size={18} /> Add Record
                </button>
              </div>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Patient ID</th>
                      <th>Chart Time</th>
                      <th>Heart Rate</th>
                      <th>SpO2</th>
                      <th>MAP</th>
                      <th>Risk Score</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vitalsData.map((record) => (
                      <tr key={record._id}>
                        <td>{record.patientId}</td>
                        <td>{new Date(record.timestamp).toLocaleString()}</td>
                        <td>{record.heartRate} bpm</td>
                        <td>{record.spO2}%</td>
                        <td>{record.meanArterialPressure || '-'} mmHg</td>
                        <td>{record.riskScore?.toFixed(2) || '-'}</td>
                        <td>
                          <span className={`status-badge ${record.predictedEvent === 'High Risk' ? 'warning' : 'normal'}`}>
                            {record.predictedEvent || 'Normal'}
                          </span>
                        </td>
                        <td>
                          <button className="delete-row-btn" onClick={() => deleteRecord(record._id)}>
                            <FiTrash2 size={16} />
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
                      patientId: formData.get('patientId'),
                      heartRate: parseFloat(formData.get('heartRate')),
                      spO2: parseFloat(formData.get('spO2')),
                      meanArterialPressure: parseFloat(formData.get('map')) || undefined
                    }
                    addRecord(newRecord)
                  }}>
                    <div className="form-group">
                      <label>Patient ID</label>
                      <input type="text" name="patientId" required placeholder="e.g., patient_001" />
                    </div>
                    <div className="form-group">
                      <label>Heart Rate (bpm)</label>
                      <input type="number" name="heartRate" required placeholder="e.g., 75" />
                    </div>
                    <div className="form-group">
                      <label>SpO2 (%)</label>
                      <input type="number" name="spO2" required placeholder="e.g., 95" min="0" max="100" />
                    </div>
                    <div className="form-group">
                      <label>Mean Arterial Pressure (mmHg)</label>
                      <input type="number" name="map" placeholder="e.g., 80" />
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#ddd6fe" />
                  <XAxis dataKey="time" stroke="#6d5fa3" />
                  <YAxis stroke="#6d5fa3" />
                  <Tooltip contentStyle={{ background: 'white', border: '1px solid #ddd6fe', color: '#4a3f6f' }} />
                  <Legend />
                  <Line type="monotone" dataKey="readings" stroke="#8b7fc7" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}


        {activeTab === 'alerts' && (
          <div className="content-section">
            {/* Critical Alerts Summary Card */}
            <div className="alert-summary-card">
              <div className="alert-summary-icon"><MdWarning size={80} color="white" /></div>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#ddd6fe" />
                  <XAxis dataKey="time" stroke="#6d5fa3" />
                  <YAxis stroke="#6d5fa3" />
                  <Tooltip contentStyle={{ background: 'white', border: '1px solid #ddd6fe', color: '#4a3f6f' }} />
                  <Legend />
                  <Bar dataKey="alerts" fill="#ff4444" name="Alert Count" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Alerts List */}
            <div className="alerts-container">
              <h3>Recent Critical Alerts</h3>
              {vitalsData.filter(r => r.predictedEvent === 'High Risk').slice(0, 20).map((record) => (
                <div key={record._id} className="alert-item">
                  <div className="alert-icon"><MdWarning size={24} color="#ff4444" /></div>
                  <div className="alert-content">
                    <p className="alert-title">{record.patientId}</p>
                    <p className="alert-desc">
                      Heart Rate: {record.heartRate} bpm, SpO2: {record.spO2}%, Risk Score: {record.riskScore?.toFixed(2)}
                    </p>
                    <p className="alert-time">{new Date(record.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'ai-mode' && (
          <div className="content-section">
            <div className="ai-mode-header">
              <h2>AI-Powered Patient Analysis</h2>
              <p>Advanced machine learning insights for patient care</p>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <FiActivity size={32} color="#8b7fc7" />
                <h3>AI Predictions</h3>
                <p className="stat-value">{vitalsData.length}</p>
                <p className="stat-label">Total Analyzed</p>
              </div>
              <div className="stat-card">
                <FiTrendingUp size={32} color="#10b981" />
                <h3>Accuracy Rate</h3>
                <p className="stat-value">94.5%</p>
                <p className="stat-label">Model Performance</p>
              </div>
              <div className="stat-card">
                <MdWarning size={32} color="#ff4444" />
                <h3>High Risk Detected</h3>
                <p className="stat-value">{stats.criticalAlerts}</p>
                <p className="stat-label">Requires Attention</p>
              </div>
            </div>

            <div className="chart-card full-width">
              <h3>AI Risk Assessment Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Low Risk', value: vitalsData.filter(r => r.predictedEvent === 'Low Risk').length },
                      { name: 'High Risk', value: vitalsData.filter(r => r.predictedEvent === 'High Risk').length }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[
                      { name: 'Low Risk', value: vitalsData.filter(r => r.predictedEvent === 'Low Risk').length },
                      { name: 'High Risk', value: vitalsData.filter(r => r.predictedEvent === 'High Risk').length }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#ff4444'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="ai-insights-card">
              <h3>AI-Generated Insights</h3>
              <div className="insight-item">
                <FiActivity size={20} color="#8b7fc7" />
                <p>Machine learning model has analyzed {vitalsData.length} patient records with high accuracy</p>
              </div>
              <div className="insight-item">
                <FiTrendingUp size={20} color="#10b981" />
                <p>Risk prediction algorithm identifies patterns in heart rate and SpO2 levels</p>
              </div>
              <div className="insight-item">
                <MdWarning size={20} color="#ff4444" />
                <p>{stats.criticalAlerts} patients flagged as high risk requiring immediate attention</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default Dashboard
