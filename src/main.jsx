import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Initialize MSW in development
if (process.env.NODE_ENV === 'development') {
  import('@/mocks/browser').then(({ worker }) => {
    worker.start({
      onUnhandledRequest: 'bypass',
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)