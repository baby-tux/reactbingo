import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Older builds (Create React App) registered a service worker; remove it from returning browsers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((registrations) => registrations.forEach((r) => void r.unregister()))
    .catch(() => {});
}

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element');
ReactDOM.createRoot(container).render(<App />);
