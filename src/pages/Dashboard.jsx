import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Papa from 'papaparse'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { FiBarChart2, FiUsers, FiTrendingUp, FiBell, FiLogOut, FiPlus, FiTrash2, FiMenu, FiX, FiActivity, FiPause, FiPlay } from 'react-icons/fi'
import { IoMdPeople, IoMdDocument, IoMdHeart } from 'react-icons/io'
import { MdWarning } from 'react-icons/md'
import { BsCircleFill, BsFileText } from 'react-icons/bs'
import AIChat from '../components/AIChat'
import AIPredictions from '../components/AIPredictions'
import AlertHistoryTab from '../components/AlertHistoryTab'
import './Dashboard.css'

function Dashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [vitalsData, setVitalsData] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    recordsPerPage: 100,
    hasNextPage: false,
    hasPrevPage: false
  })
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalRecords: 0,
    avgHeartRate: 0,
    criticalAlerts: 0
  })
  const [viewMode, setViewMode] = useState('live') // 'live', 'pagination', or 'infinite'
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date())
  const [patients, setPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState('all') // 'all' or specific patient ID
  const [isPaused, setIsPaused] = useState(false) // Pause/Resume live updates

  // Fetch data from MongoDB with pagination
  const fetchVitalsData = async (page = 1, showLoader = true, append = false) => {
    try {
      if (showLoader) {
        setLoading(true)
      }
      if (append) {
        setLoadingMore(true)
      }
      
      const patientFilter = selectedPatient !== 'all' ? `&patientId=${selectedPatient}` : '';
      const vitalsResponse = await fetch(`http://localhost:3000/api/vitals?page=${page}&limit=100${patientFilter}`)
      const result = await vitalsResponse.json()
      
      if (result.data && result.pagination) {
        if (append) {
          // Append new data for infinite scroll
          setVitalsData(prev => [...prev, ...result.data])
        } else {
          // Replace data for pagination
          setVitalsData(result.data)
        }
        setPagination(result.pagination)
        setHasMore(result.pagination.hasNextPage)
        setCurrentPage(page)
        
        // Fetch stats separately
        try {
          const statsResponse = await fetch(`http://localhost:3000/api/stats?${selectedPatient !== 'all' ? `patientId=${selectedPatient}` : ''}`)
          const statsData = await statsResponse.json()
          setStats(statsData)
        } catch (statsError) {
          console.error('Error fetching stats, using fallback:', statsError)
          // Fallback: calculate stats from current data
          const uniquePatients = new Set(result.data.map(d => d.patientId)).size
          const avgHR = result.data.length > 0 
            ? result.data.reduce((sum, d) => sum + (d.heartRate || 0), 0) / result.data.length 
            : 0
          const criticalCount = result.data.filter(d => d.predictedEvent === 'High Risk').length
          
          setStats({
            totalPatients: uniquePatients,
            totalRecords: result.pagination.totalRecords,
            avgHeartRate: avgHR.toFixed(1),
            criticalAlerts: criticalCount
          })
        }
      }
      
      if (showLoader) {
        setLoading(false)
      }
      if (append) {
        setLoadingMore(false)
      }
    } catch (error) {
      console.error('Error fetching vitals data:', error)
      if (showLoader) {
        setLoading(false)
      }
      if (append) {
        setLoadingMore(false)
      }
    }
  }

  // Fetch list of patients
  const fetchPatients = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/patients')
      const data = await response.json()
      setPatients(data)
    } catch (error) {
      console.error('Error fetching patients:', error)
    }
  }

  // Load more data for infinite scroll
  const loadMoreData = () => {
    if (!loadingMore && hasMore && viewMode === 'infinite') {
      fetchVitalsData(currentPage + 1, false, true)
    }
  }

  // Handle scroll event for infinite scroll
  const handleScroll = (e) => {
    if (viewMode !== 'infinite') return
    
    const { scrollTop, scrollHeight, clientHeight } = e.target
    if (scrollHeight - scrollTop <= clientHeight * 1.5) {
      loadMoreData()
    }
  }

  useEffect(() => {
    fetchPatients() // Fetch patient list on mount
  }, [])

  useEffect(() => {
    // When patient filter or view mode changes, reset and fetch new data
    setVitalsData([])
    setCurrentPage(1)
    fetchVitalsData(1, true, false)
  }, [selectedPatient, viewMode])

  useEffect(() => {
    // Live mode: Auto-refresh every second, replacing old data
    if (viewMode === 'live' && !isPaused) {
      const interval = setInterval(() => {
        fetchVitalsData(1, false, false) // Always fetch page 1 in live mode
        setLastUpdateTime(new Date())
      }, 1000) // Update every second
      
      return () => clearInterval(interval)
    }
  }, [viewMode, selectedPatient, isPaused]) // Re-run when patient filter or pause state changes

  const deleteRecord = async (id) => {
    // For now, just remove from local state
    // You can add a DELETE endpoint later
    const newData = vitalsData.filter(record => record._id !== id)
    setVitalsData(newData)
  }

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
            className={activeTab === 'alert-history' ? 'active' : ''} 
            onClick={() => setActiveTab('alert-history')}
            title="Alert History"
          >
            <FiBell size={18} /> {sidebarOpen && 'Alert History'}
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
            {viewMode === 'live' && (
              <button 
                onClick={() => setIsPaused(!isPaused)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '2px solid',
                  borderColor: isPaused ? '#10b981' : '#ff4444',
                  background: isPaused ? '#10b981' : '#ff4444',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginRight: '15px',
                  transition: 'all 0.3s ease'
                }}
              >
                {isPaused ? (
                  <>
                    <FiPlay size={16} />
                    Resume Live Updates
                  </>
                ) : (
                  <>
                    <FiPause size={16} />
                    Pause Live Updates
                  </>
                )}
              </button>
            )}
            <div className="navbar-item notification">
              <FiBell size={20} />
              <span className="badge">{stats.criticalAlerts}</span>
            </div>
          </div>
        </nav>

        {/* Content based on active tab */}
        {activeTab === 'overview' && (
          <div className="content-section">
            {viewMode === 'live' && (
              <div style={{ 
                background: isPaused 
                  ? 'linear-gradient(135deg, rgba(255, 165, 0, 0.1) 0%, rgba(139, 127, 199, 0.1) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 68, 68, 0.1) 0%, rgba(139, 127, 199, 0.1) 100%)',
                padding: '15px',
                borderRadius: '12px',
                marginBottom: '20px',
                border: isPaused ? '2px solid rgba(255, 165, 0, 0.3)' : '2px solid rgba(255, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                {isPaused ? (
                  <FiPause size={24} color="#ff9800" />
                ) : (
                  <BsCircleFill size={20} color="#ff4444" />
                )}
                <div>
                  <strong style={{ color: isPaused ? '#ff9800' : '#ff4444' }}>
                    {isPaused ? 'LIVE MONITORING PAUSED' : 'LIVE MONITORING MODE'}
                  </strong>
                  <p style={{ margin: 0, fontSize: '14px', color: '#5a5278' }}>
                    {isPaused 
                      ? 'Data updates paused • Click Resume to continue monitoring'
                      : 'Showing latest readings • Updates every second • Switch to History to view all records'
                    }
                  </p>
                </div>
              </div>
            )}
            
            {/* Subject Filter */}
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <label style={{ fontWeight: '600', color: '#5a5278' }}>Filter by Subject:</label>
              <select 
                value={selectedPatient}
                onChange={(e) => {
                  setSelectedPatient(e.target.value)
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '2px solid #e8e3fa',
                  background: 'white',
                  color: '#5a5278',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <option value="all">All Subjects</option>
                {patients.map(patient => (
                  <option key={patient.id} value={patient.id}>
                    {patient.label}
                  </option>
                ))}
              </select>
            </div>
            
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
                  <p className="stat-label">Avg Heart Rate</p>
                  <p className="stat-value">{stats.avgHeartRate} bpm</p>
                </div>
              </div>
            </div>

            {/* AI Continuous Monitoring Predictions - Only for specific patient */}
            {selectedPatient !== 'all' && (
              <AIPredictions vitalsData={vitalsData} patients={patients} selectedPatient={selectedPatient} />
            )}

            {selectedPatient === 'all' && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(139, 127, 199, 0.1) 0%, rgba(167, 139, 250, 0.1) 100%)',
                border: '2px solid #8b7fc7',
                borderRadius: '12px',
                padding: 30,
                marginTop: 20,
                textAlign: 'center'
              }}>
                <FiActivity size={48} color="#8b7fc7" style={{ marginBottom: 15 }} />
                <h3 style={{ color: '#4a3f6f', marginBottom: 10 }}>AI Risk Prediction</h3>
                <p style={{ color: '#6d5fa3', fontSize: 16 }}>
                  Select a specific patient from the dropdown above to see AI-powered risk analysis and predictions
                </p>
              </div>
            )}

            {/* High Risk Patients Section */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(255, 68, 68, 0.05) 0%, rgba(255, 152, 0, 0.05) 100%)',
              border: '2px solid #ff4444',
              borderRadius: '12px',
              padding: '20px',
              marginTop: '20px',
              boxShadow: '0 4px 12px rgba(255, 68, 68, 0.15)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                <MdWarning size={28} color="#ff4444" />
                <h3 style={{ margin: 0, color: '#ff4444', fontSize: '20px' }}>High Risk Patients - Immediate Attention Required</h3>
              </div>
              
              {vitalsData.filter(r => r.predictedEvent === 'High Risk').length > 0 ? (
                <div style={{ 
                  background: 'white', 
                  borderRadius: '8px', 
                  padding: '15px',
                  maxHeight: '500px',
                  overflowY: 'auto'
                }}>
                  <table className="data-table" style={{ border: '2px solid #ff4444' }}>
                    <thead style={{ background: '#ff4444', color: 'white' }}>
                      <tr>
                        <th>Patient ID</th>
                        <th>Latest Alert Time</th>
                        <th>Heart Rate</th>
                        <th>SpO2</th>
                        <th>MAP</th>
                        <th>Risk Score</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        // Get unique patients with their latest high-risk record
                        const highRiskRecords = vitalsData.filter(r => r.predictedEvent === 'High Risk');
                        const uniquePatients = {};
                        
                        highRiskRecords.forEach(record => {
                          if (!uniquePatients[record.patientId] || 
                              new Date(record.timestamp) > new Date(uniquePatients[record.patientId].timestamp)) {
                            uniquePatients[record.patientId] = record;
                          }
                        });
                        
                        return Object.values(uniquePatients).map((record) => (
                          <tr key={record._id} style={{ background: 'rgba(255, 68, 68, 0.05)' }}>
                            <td style={{ fontWeight: '700', color: '#ff4444' }}>{record.patientId}</td>
                            <td>{new Date(record.timestamp).toLocaleString()}</td>
                            <td style={{ 
                              fontWeight: '700',
                              color: record.heartRate > 100 ? '#ff4444' : '#5a5278'
                            }}>
                              {record.heartRate} bpm
                            </td>
                            <td style={{ 
                              fontWeight: '700',
                              color: record.spO2 < 90 ? '#ff4444' : '#5a5278'
                            }}>
                              {record.spO2}%
                            </td>
                            <td>{record.meanArterialPressure || '-'} mmHg</td>
                            <td style={{ fontWeight: '700', color: '#ff4444' }}>
                              {record.riskScore?.toFixed(2) || '-'}
                            </td>
                            <td>
                              <span style={{
                                background: '#ff4444',
                                color: 'white',
                                padding: '4px 12px',
                                borderRadius: '20px',
                                fontSize: '12px',
                                fontWeight: '700',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px'
                              }}>
                                <MdWarning size={14} />
                                HIGH RISK
                              </span>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px',
                  color: '#10b981',
                  fontSize: '18px',
                  fontWeight: '600'
                }}>
                  <FiActivity size={48} color="#10b981" style={{ marginBottom: '10px' }} />
                  <p>No high-risk patients detected. All vitals within normal range.</p>
                </div>
              )}
            </div>
          </div>
        )}


        {activeTab === 'patients' && (
          <div className="content-section">
            <div className="table-card">
              <div className="table-header">
                <h3>Patient Records ({pagination.totalRecords.toLocaleString()} total)</h3>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Patient Filter */}
                  <select 
                    value={selectedPatient}
                    onChange={(e) => {
                      setSelectedPatient(e.target.value)
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '2px solid #e8e3fa',
                      background: 'white',
                      color: '#5a5278',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="all">All Patients</option>
                    {patients.map(patient => (
                      <option key={patient.id} value={patient.id}>
                        {patient.label}
                      </option>
                    ))}
                  </select>
                  
                  {/* View Mode Buttons */}
                  <button 
                    className={`view-mode-btn ${viewMode === 'live' ? 'active' : ''}`}
                    onClick={() => setViewMode('live')}
                  >
                     Live Monitor
                  </button>
                  <button 
                    className={`view-mode-btn ${viewMode === 'infinite' ? 'active' : ''}`}
                    onClick={() => setViewMode('infinite')}
                  >
                     History
                  </button>
                  {viewMode === 'live' && (
                    <span style={{ color: isPaused ? '#ff9800' : '#8b7fc7', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {isPaused ? (
                        <>
                          <FiPause size={14} /> Paused
                        </>
                      ) : (
                        <>
                          <FiActivity size={14} /> Last update: {lastUpdateTime.toLocaleTimeString()}
                        </>
                      )}
                    </span>
                  )}
                </div>
              </div>
              <div className="table-wrapper" onScroll={handleScroll} style={{ maxHeight: viewMode === 'infinite' ? '600px' : 'auto', overflowY: viewMode === 'infinite' ? 'auto' : 'visible' }}>
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
                {viewMode === 'infinite' && loadingMore && (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#8b7fc7' }}>
                    Loading more records...
                  </div>
                )}
                {viewMode === 'infinite' && !hasMore && vitalsData.length > 0 && (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#9d96bb' }}>
                    All records loaded ({vitalsData.length.toLocaleString()} of {pagination.totalRecords.toLocaleString()})
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="content-section">
            {/* Patient Filter */}
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <label style={{ fontWeight: '600', color: '#5a5278' }}>Select Patient:</label>
              <select 
                value={selectedPatient}
                onChange={(e) => {
                  setSelectedPatient(e.target.value)
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '2px solid #e8e3fa',
                  background: 'white',
                  color: '#5a5278',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <option value="all">All Subjects</option>
                {patients.map(patient => (
                  <option key={patient.id} value={patient.id}>
                    {patient.label}
                  </option>
                ))}
              </select>
            </div>

            {selectedPatient === 'all' ? (
              <div style={{
                background: 'linear-gradient(135deg, rgba(139, 127, 199, 0.1) 0%, rgba(167, 139, 250, 0.1) 100%)',
                border: '2px solid #8b7fc7',
                borderRadius: '12px',
                padding: 40,
                textAlign: 'center'
              }}>
                <FiActivity size={48} color="#8b7fc7" style={{ marginBottom: 15 }} />
                <h3 style={{ color: '#4a3f6f', marginBottom: 10 }}>Patient Analytics</h3>
                <p style={{ color: '#6d5fa3', fontSize: 16 }}>
                  Select a specific patient from the dropdown above to view detailed heart rate analysis and trends
                </p>
              </div>
            ) : (
              <>
                {/* Analytics Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                  <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px'
                  }}>
                    <div style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #8b7fc7 0%, #a78bfa 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <BsFileText size={24} color="white" />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '12px', color: '#9d96bb', fontWeight: '600' }}>Baseline Deviation</p>
                      <p style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#4a3f6f' }}>
                        {(() => {
                          const patientData = vitalsData.filter(v => v.patientId === selectedPatient);
                          if (patientData.length < 10) return '0%';
                          const baseline = patientData.slice(-50).reduce((sum, v) => sum + v.heartRate, 0) / Math.min(50, patientData.length);
                          const current = patientData[0]?.heartRate || 0;
                          const deviation = Math.abs(((current - baseline) / baseline) * 100);
                          return deviation.toFixed(1) + '%';
                        })()}
                      </p>
                      <p style={{ margin: 0, fontSize: '11px', color: '#10b981' }}>Within Normal Range</p>
                    </div>
                  </div>

                  <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px'
                  }}>
                    <div style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #ff4444 0%, #ff6b6b 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <IoMdHeart size={24} color="white" />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '12px', color: '#9d96bb', fontWeight: '600' }}>Heart Rate Variability</p>
                      <p style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#4a3f6f' }}>
                        {(() => {
                          const patientData = vitalsData.filter(v => v.patientId === selectedPatient);
                          if (patientData.length < 2) return '0';
                          const hrs = patientData.slice(0, 50).map(v => v.heartRate);
                          const mean = hrs.reduce((a, b) => a + b, 0) / hrs.length;
                          const variance = hrs.reduce((sum, hr) => sum + Math.pow(hr - mean, 2), 0) / hrs.length;
                          return Math.sqrt(variance).toFixed(1);
                        })()}
                      </p>
                      <p style={{ margin: 0, fontSize: '11px', color: '#10b981' }}>Normal Variability</p>
                    </div>
                  </div>

                  <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px'
                  }}>
                    <div style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <FiActivity size={24} color="white" />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '12px', color: '#9d96bb', fontWeight: '600' }}>Patient Status</p>
                      <p style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#10b981' }}>Normal</p>
                      <p style={{ margin: 0, fontSize: '11px', color: '#10b981' }}>Stable Condition</p>
                    </div>
                  </div>
                </div>

                {/* Heart Rate Trend Analysis Chart */}
                <div className="chart-card full-width">
                  <h3>Heart Rate Trend Analysis</h3>
                  <p style={{ color: '#9d96bb', fontSize: '14px', marginBottom: '20px' }}>
                    Real-time heart rate monitoring with baseline comparison (Last 50 readings)
                  </p>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={(() => {
                      const patientData = vitalsData
                        .filter(v => v.patientId === selectedPatient)
                        .slice(0, 50)
                        .reverse();
                      
                      if (patientData.length === 0) return [];
                      
                      const baseline = patientData.reduce((sum, v) => sum + v.heartRate, 0) / patientData.length;
                      
                      return patientData.map((v, idx) => ({
                        index: idx + 1,
                        currentHR: v.heartRate,
                        baseline: baseline
                      }));
                    })()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8e3fa" />
                      <XAxis 
                        dataKey="index" 
                        stroke="#6d5fa3"
                      />
                      <YAxis 
                        stroke="#6d5fa3"
                        label={{ value: 'Heart Rate (bpm)', angle: -90, position: 'insideLeft', fill: '#6d5fa3' }}
                        domain={[0, 140]}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'white', 
                          border: '2px solid #8b7fc7', 
                          borderRadius: '8px',
                          padding: '10px'
                        }}
                        formatter={(value, name) => {
                          if (name === 'currentHR') return [value + ' bpm', 'Current HR'];
                          if (name === 'baseline') return [value.toFixed(2) + ' bpm', 'Baseline'];
                          return [value, name];
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="currentHR" 
                        stroke="#8b7fc7" 
                        strokeWidth={2}
                        name="Current HR"
                        dot={{ fill: '#8b7fc7', r: 3 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="baseline" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name="Baseline"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Readings Timeline */}
                <div className="chart-card full-width" style={{ marginTop: '20px' }}>
                  <h3>Readings Timeline</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={(() => {
                      const patientData = vitalsData.filter(v => v.patientId === selectedPatient);
                      const timeline = {};
                      patientData.forEach(record => {
                        if (record.timestamp) {
                          const hour = new Date(record.timestamp).getHours();
                          timeline[hour] = (timeline[hour] || 0) + 1;
                        }
                      });
                      return Object.entries(timeline).sort((a, b) => a[0] - b[0]).map(([hour, count]) => ({
                        time: `${hour}:00`,
                        readings: count
                      }));
                    })()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ddd6fe" />
                      <XAxis dataKey="time" stroke="#6d5fa3" />
                      <YAxis stroke="#6d5fa3" />
                      <Tooltip contentStyle={{ background: 'white', border: '1px solid #ddd6fe', color: '#4a3f6f' }} />
                      <Legend />
                      <Line type="monotone" dataKey="readings" stroke="#8b7fc7" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        )}


        {activeTab === 'alerts' && (
          <div className="content-section">
            {viewMode === 'live' && (
              <div style={{ 
                background: isPaused 
                  ? 'linear-gradient(135deg, rgba(255, 165, 0, 0.1) 0%, rgba(139, 127, 199, 0.1) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 68, 68, 0.1) 0%, rgba(139, 127, 199, 0.1) 100%)',
                padding: '15px',
                borderRadius: '12px',
                marginBottom: '20px',
                border: isPaused ? '2px solid rgba(255, 165, 0, 0.3)' : '2px solid rgba(255, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                {isPaused ? (
                  <FiPause size={24} color="#ff9800" />
                ) : (
                  <BsCircleFill size={20} color="#ff4444" />
                )}
                <div>
                  <strong style={{ color: isPaused ? '#ff9800' : '#ff4444' }}>
                    {isPaused ? 'LIVE ALERT MONITORING PAUSED' : 'LIVE ALERT MONITORING'}
                  </strong>
                  <p style={{ margin: 0, fontSize: '14px', color: '#5a5278' }}>
                    {isPaused 
                      ? 'Alert monitoring paused • Click Resume to continue'
                      : 'Real-time critical alerts • AI analysis active • Updates every second'
                    }
                  </p>
                </div>
              </div>
            )}
            {/* Patient Filter */}
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <label style={{ fontWeight: '600', color: '#5a5278' }}>Filter by Subject:</label>
              <select 
                value={selectedPatient}
                onChange={(e) => {
                  setSelectedPatient(e.target.value)
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '2px solid #e8e3fa',
                  background: 'white',
                  color: '#5a5278',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <option value="all">All Subjects</option>
                {patients.map(patient => (
                  <option key={patient.id} value={patient.id}>
                    {patient.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Critical Alerts Summary Card */}
            <div className="alert-summary-card">
              <div className="alert-summary-icon"><MdWarning size={80} color="white" /></div>
              <div className="alert-summary-content">
                <p className="alert-summary-label">Critical Alerts</p>
                <p className="alert-summary-value">{stats.criticalAlerts}</p>
              </div>
            </div>

            {/* Real-Time Alert Analysis Chart */}
            <div className="chart-card full-width">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3>Real-Time Alert Analysis</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {viewMode === 'live' && !isPaused && (
                    <span style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '5px',
                      color: '#ff4444',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>
                      <BsCircleFill size={10} color="#ff4444" />
                      Live Monitoring
                    </span>
                  )}
                  <span style={{ fontSize: '12px', color: '#9d96bb' }}>
                    Last updated: {lastUpdateTime.toLocaleTimeString()}
                  </span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={getAlertTimelineData()}>
                  <defs>
                    <linearGradient id="alertGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff4444" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ff4444" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ddd6fe" />
                  <XAxis dataKey="time" stroke="#6d5fa3" />
                  <YAxis stroke="#6d5fa3" />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'white', 
                      border: '2px solid #ff4444', 
                      borderRadius: '8px',
                      color: '#4a3f6f' 
                    }} 
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="alerts" 
                    stroke="#ff4444" 
                    strokeWidth={3}
                    fill="url(#alertGradient)"
                    fillOpacity={1}
                    name="Alert Count"
                    dot={{ fill: '#ff4444', strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
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

        {activeTab === 'alert-history' && (
          <div className="content-section">
            <AlertHistoryTab />
          </div>
        )}

        {activeTab === 'ai-mode' && (
          <div className="content-section">
            <div className="ai-mode-header">
              <h2>AI-Powered Patient Analysis</h2>
              <p>Ask questions about patient vitals, risk predictions, and health trends</p>
            </div>

            <div className="stats-grid" style={{ marginBottom: '20px' }}>
              <div className="stat-card">
                <FiActivity size={32} color="#8b7fc7" />
                <h3>AI Predictions</h3>
                <p className="stat-value">{vitalsData.length}</p>
                <p className="stat-label">Total Analyzed</p>
              </div>
              <div className="stat-card">
                <FiTrendingUp size={32} color="#10b981" />
                <h3>Active Patients</h3>
                <p className="stat-value">{patients.length}</p>
                <p className="stat-label">Being Monitored</p>
              </div>
              <div className="stat-card">
                <MdWarning size={32} color="#ff4444" />
                <h3>High Risk Detected</h3>
                <p className="stat-value">{stats.criticalAlerts}</p>
                <p className="stat-label">Requires Attention</p>
              </div>
            </div>

            <AIChat patients={patients} vitalsData={vitalsData} />

            <div className="ai-insights-card" style={{ marginTop: '20px' }}>
              <h3>Example Questions You Can Ask:</h3>
              <div className="insight-item">
                <FiActivity size={20} color="#8b7fc7" />
                <p>"What is the current status of patient 10005348?"</p>
              </div>
              <div className="insight-item">
                <FiTrendingUp size={20} color="#10b981" />
                <p>"Which patients are currently at high risk?"</p>
              </div>
              <div className="insight-item">
                <MdWarning size={20} color="#ff4444" />
                <p>"Analyze the vital signs trends for all patients"</p>
              </div>
              <div className="insight-item">
                <FiUsers size={20} color="#8b7fc7" />
                <p>"What are the average vital signs across all patients?"</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default Dashboard
