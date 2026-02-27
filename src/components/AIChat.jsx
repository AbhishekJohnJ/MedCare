import { useState, useRef, useEffect } from 'react'
import { FiSend, FiUser, FiCpu } from 'react-icons/fi'
import './AIChat.css'

function AIChat({ patients, vitalsData }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I\'m your AI medical assistant. I can help you analyze patient data and predict high-risk cases. Ask me about specific patients or general health trends.'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const getPatientContext = (patientId) => {
    const patientRecords = vitalsData.filter(v => v.patientId === patientId)
    if (patientRecords.length === 0) return null

    const latest = patientRecords[0]
    const highRiskCount = patientRecords.filter(r => r.predictedEvent === 'High Risk').length
    const avgHR = patientRecords.reduce((sum, r) => sum + r.heartRate, 0) / patientRecords.length
    const avgSpO2 = patientRecords.reduce((sum, r) => sum + r.spO2, 0) / patientRecords.length

    return {
      patientId,
      totalRecords: patientRecords.length,
      latestVitals: {
        heartRate: latest.heartRate,
        spO2: latest.spO2,
        map: latest.meanArterialPressure,
        riskScore: latest.riskScore,
        status: latest.predictedEvent,
        timestamp: latest.timestamp
      },
      statistics: {
        avgHeartRate: avgHR.toFixed(1),
        avgSpO2: avgSpO2.toFixed(1),
        highRiskCount,
        highRiskPercentage: ((highRiskCount / patientRecords.length) * 100).toFixed(1)
      }
    }
  }

  const getAllPatientsContext = () => {
    const highRiskPatients = vitalsData.filter(v => v.predictedEvent === 'High Risk')
    const uniqueHighRisk = [...new Set(highRiskPatients.map(v => v.patientId))]
    
    return {
      totalPatients: patients.length,
      totalRecords: vitalsData.length,
      highRiskPatients: uniqueHighRisk.length,
      highRiskList: uniqueHighRisk.slice(0, 5),
      avgHeartRate: (vitalsData.reduce((sum, r) => sum + r.heartRate, 0) / vitalsData.length).toFixed(1),
      avgSpO2: (vitalsData.reduce((sum, r) => sum + r.spO2, 0) / vitalsData.length).toFixed(1)
    }
  }

  const sendMessage = async () => {
    if (!input.trim()) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      // Detect if asking about specific patient
      const patientMatch = userMessage.match(/\b(\d{8})\b/)
      let context = ''

      if (patientMatch) {
        const patientId = patientMatch[1]
        const patientData = getPatientContext(patientId)
        if (patientData) {
          context = `Patient Data for ${patientId}:\n${JSON.stringify(patientData, null, 2)}\n\n`
        }
      } else {
        // General query - provide overview
        const overview = getAllPatientsContext()
        context = `Current System Overview:\n${JSON.stringify(overview, null, 2)}\n\n`
      }

      console.log('Sending request to:', 'http://localhost:3000/api/ai/chat')
      console.log('Message:', userMessage)
      console.log('Context:', context)

      const response = await fetch('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          context: context
        })
      })

      console.log('Response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Error response:', errorText)
        throw new Error(`Server error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log('AI Response:', data)
      
      if (data.response) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      } else {
        throw new Error('No response from AI')
      }
    } catch (error) {
      console.error('AI Chat error:', error)
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${error.message}\n\nPlease make sure the backend server has been restarted with the AI endpoint. Stop the server (Ctrl+C) and run: node backend/server.js` 
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="ai-chat-container">
      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-message ${msg.role}`}>
            <div className="message-icon">
              {msg.role === 'user' ? (
                <FiUser size={20} />
              ) : (
                <FiCpu size={20} />
              )}
            </div>
            <div className="message-content">
              <div className="message-role">
                {msg.role === 'user' ? 'You' : 'AI Assistant'}
              </div>
              <div className="message-text">{msg.content}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat-message assistant">
            <div className="message-icon">
              <FiCpu size={20} />
            </div>
            <div className="message-content">
              <div className="message-role">AI Assistant</div>
              <div className="message-text typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="chat-input-container">
        <input
          type="text"
          className="chat-input"
          placeholder="Ask about patient vitals, risk predictions, or health trends..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
        />
        <button 
          className="chat-send-btn"
          onClick={sendMessage}
          disabled={loading || !input.trim()}
        >
          <FiSend size={20} />
        </button>
      </div>
    </div>
  )
}

export default AIChat
