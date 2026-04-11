import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ReportWiza from './auth/report_wiza';
import './app.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<ReportWiza />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;