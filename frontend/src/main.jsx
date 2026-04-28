import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import './App.css'
import { WarningProvider } from './context/WarningContext'   // ← NEW

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <WarningProvider>
        <App />
      </WarningProvider>
    </BrowserRouter>
  </React.StrictMode>
)