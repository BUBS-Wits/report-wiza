import React, { useEffect, useState } from 'react';
import { db } from './firebase_config';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import './app.css';

function App() {
  const [message, set_message] = useState('Connecting to Firebase...');
  const [db_status, set_db_status] = useState('');

  useEffect(() => {
    seed_and_read();
  }, []);

  const seed_and_read = async () => {
    try {
      const collection_ref = collection(db, 'hello_world');
      const snapshot = await getDocs(collection_ref);

      if (snapshot.empty) {
        await addDoc(collection_ref, { text: 'Hello World from Firestore!' });
        set_db_status('First run — document created in Firestore.');
      }

      const updated_snapshot = await getDocs(collection_ref);
      const first_doc = updated_snapshot.docs[0];
      set_message(first_doc.data().text);
      set_db_status(prev => prev || 'Document read from Firestore successfully.');
    } catch (error) {
      set_message('Firebase connection failed.');
      set_db_status(error.message);
    }
  };

  return (
    <div className="app_container">
      <h1>{message}</h1>
      <p className="db_status">{db_status}</p>
      <p className="stack_info">
        React · Firebase Firestore · Deployed on Azure
      </p>
    </div>
  );
}

export default App;