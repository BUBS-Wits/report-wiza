import React, { useEffect, useState } from 'react';
import { auth, db } from '../../firebase_config.js';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import './resident_requests.css';

function ResidentRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setError('Please log in to view your requests.');
      setLoading(false);
      return;
    }

    const fetchRequests = async () => {
      try {
        const q = query(
          collection(db, 'requests'),
          where('resident_uid', '==', user.uid),
          orderBy('created_at', 'desc')
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRequests(data);
      } catch (err) {
        console.error('Firestore error:', err);
        setError('Could not load your requests. Try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  if (loading) return <div className="loading">Loading your requests...</div>;
  if (error) return <div className="error">{error}</div>;
  if (requests.length === 0) {
    return <div className="empty">You haven’t submitted any service requests yet.</div>;
  }

  return (
    <div className="resident_requests_container">
      <h2>My Service Requests</h2>
      <ul className="requests_list">
        {requests.map(req => (
          <li key={req.id} className="request_item">
            <div className="request_header">
              <span className="request_category">{req.category || 'Other'}</span>
              <span className={`request_status status_${req.status || 'open'}`}>
                {req.status || 'open'}
              </span>
            </div>
            <p className="request_description">{req.description || 'No description'}</p>
            <div className="request_footer">
              <span className="request_date">
                Submitted: {req.created_at?.toDate ? req.created_at.toDate().toLocaleDateString() : 'Unknown date'}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ResidentRequests;