import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ReportWiza from './auth/report_wiza.js';
import './app.css';

// Temporary placeholder pages
const Resident = () => <h1>Welcome, Resident!</h1>;
const Admin    = () => <h1>Welcome, Admin!</h1>;
const Worker   = () => <h1>Welcome, Worker!</h1>;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<ReportWiza />} />
        <Route path="/resident" element={<Resident />} />
        <Route path="/admin"    element={<Admin />} />
        <Route path="/worker"   element={<Worker />} />
        <Route path="*"         element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
