import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ReportWiza from './auth/report_wiza.js';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ReportWiza />} />
        <Route path="/resident" element={<div>Resident Dashboard</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;