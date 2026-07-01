import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@xyflow/react/dist/style.css';
import './index.css';
import './styles/theme.css';
import './styles/themes/index.css';
import './styles/theme-cb-layer.css';
import './styles/learn-studio.css';
import './styles/mobile.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
