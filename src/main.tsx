import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './cadmium.css';
import './workspace.css';

// No StrictMode: one native WebGL context per viewport lifecycle.
createRoot(document.getElementById('root')!).render(<App />);
