import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'; // add routing
import { db } from './firebase_config.js';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import ResidentRequests from './pages/resident/resident_requests.js'; // your component
import './app.css';

// The existing test component (rename it or keep as Home)
function HomePage() {
  const [message, set_message] = useState('Connecting to Firebase...');
  const [db_status, set_db_status] = useState('');

  const seed_and_read = async (cancelled_ref) => {
    try {
      const collection_ref = collection(db, 'hello_world');
      const snapshot = await getDocs(collection_ref);

      if (snapshot.empty) {
        await addDoc(collection_ref, {
          text: 'Hello World from Firestore!',
        });
        if (cancelled_ref.current) return;
        set_db_status('First run — document created in Firestore.');
      }

      const updated_snapshot = await getDocs(collection_ref);
      const first_doc = updated_snapshot.docs[0];
      if (cancelled_ref.current) return;
      set_message(first_doc.data().text);
      set_db_status(prev => prev || 'Document read from Firestore successfully.');
    } catch (error) {
      if (cancelled_ref.current) return;
      set_message('Firebase connection failed.');
      set_db_status(error.message);
    }
  };

  useEffect(() => {
    const cancelled_ref = { current: false };
    seed_and_read(cancelled_ref);
    return () => { cancelled_ref.current = true; };
  }, []);

  return (
    <div className="app_container">
      <h1>{message}</h1>
      <p className="db_status">{db_status}</p>
      <p className="stack_info">React · Firebase Firestore · Deployed on Azure</p>
      <nav>
        <Link to="/resident/requests">View My Requests</Link>
      </nav>
    </div>
  );
}

// Main App component with routing
function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/resident/requests" element={<ResidentRequests />} />
    </Routes>
  );
}

export default App;
