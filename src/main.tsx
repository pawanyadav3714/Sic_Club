import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register PWA service worker for installability and offline support
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(<App />);
