import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';  // ← add this
import './app.css';
import App from './app.js';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>      {/* ← wrap App with BrowserRouter */}
      <App />
    </BrowserRouter>
  </React.StrictMode>
);