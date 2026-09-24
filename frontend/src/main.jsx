import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Older builds (Create React App) registered a service worker; remove it from returning browsers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((registrations) => registrations.forEach((r) => r.unregister()))
    .catch(() => {});
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
