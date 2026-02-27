import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../App.css'

function Dashboard() {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState([
    { id: 1, text: 'Build something awesome', completed: false },
    { id: 2, text: 'Learn React hooks', completed: true }
  ])
  const [input, setInput] = useState('')

  const addTask = () => {
    if (input.trim()) {
      setTasks([...tasks, { id: Date.now(), text: input, completed: false }])
      setInput('')
    }
  }

  const toggleTask = (id) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ))
  }

  const deleteTask = (id) => {
    setTasks(tasks.filter(task => task.id !== id))
  }

  const handleLogout = () => {
    navigate('/login')
  }

  return (
    <div className="app">
      <header>
        <h1>Task Manager</h1>
        <p>Keep track of your daily tasks</p>
        <button onClick={handleLogout} style={{ marginTop: '1rem' }}>
          Logout
        </button>
      </header>

      <div className="task-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addTask()}
          placeholder="Add a new task..."
        />
        <button onClick={addTask}>Add</button>
      </div>

      <div className="task-list">
        {tasks.map(task => (
          <div key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
            <input
              type="checkbox"
              checked={task.completed}
              onChange={() => toggleTask(task.id)}
            />
            <span>{task.text}</span>
            <button onClick={() => deleteTask(task.id)} className="delete-btn">×</button>
          </div>
        ))}
      </div>

      <div className="stats">
        <span>{tasks.filter(t => !t.completed).length} active</span>
        <span>{tasks.filter(t => t.completed).length} completed</span>
      </div>
    </div>
  )
}

export default Dashboard
