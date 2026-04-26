import React from 'react';
import LikeButton from './like_button/like_button.js';

function RequestCard({ request }) {
  const status = request.status || '';
  const category = request.category || 'Uncategorized';
  const description = request.description || 'No description';
  const ward = request.ward || '';
  const municipality = request.municipality || '';

  const showLikeButton = status && status !== 'Resolved' && status !== 'Closed';

  return (
    <div className="request_card">
      <div className="request_card_top">
        <h3>{category}</h3>
        <span className={`status_badge ${status.toLowerCase().replace(/\s+/g, '_')}`}>
          {status || 'Unknown'}
        </span>
      </div>
      <p className="request_location">{ward} - {municipality}</p>
      <p className="request_description">{description}</p>
      {showLikeButton && (
        <div className="request_footer">
          <LikeButton requestId={request.id} initialLikeCount={request.like_count || 0} />
        </div>
      )}
    </div>
  );
}

export default RequestCard;