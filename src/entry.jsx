import React, { useState } from 'react';
import './entry.css';
import LessonModal from './lesson_modal';

// Modal component for alerts and reflections
const Modal = ({ message, onClose, isReflection = false }) => (
  <div className="modal-overlay">
    <div className={`modal-content ${isReflection ? 'reflection-modal' : ''}`}>
      {isReflection ? (
        <>
          <div className="reflection-header">
            <h3>✨ Your Reflection</h3>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
          <div className="reflection-body">
            {message}
          </div>
        </>
      ) : (
        <>
          <p>{message}</p>
          <button onClick={onClose}>Close</button>
        </>
      )}
    </div>
  </div>
);

function Entry() {
  const [journalText, setJournalText] = useState('');
  const [loading, setLoading] = useState(false);
  const [reflection, setReflection] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showReflectionModal, setShowReflectionModal] = useState(false);

  const handleSubmit = async () => {
    if (!journalText.trim()) {
      setShowModal(true);
      return;
    }

    setLoading(true);
    setReflection('');
    setShowReflectionModal(false);

    try {
      const response = await fetch('http://localhost:9999/generate-reflections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ journalEntry: journalText }),
      });

      const data = await response.json();
      setReflection(data.reflection);
      setShowReflectionModal(true); // Show reflection in modal when received
    } catch (error) {
      console.error('Error generating reflection:', error);
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => setShowModal(false);
  const closeReflectionModal = () => setShowReflectionModal(false);

  return (
    <>
      <div className="journal-entry-container">
        <h2 className="journal-title">📝 Journal Entry</h2>
        <textarea
          className="journal-input"
          placeholder="Your thoughts, feelings, or observations"
          value={journalText}
          onChange={(e) => setJournalText(e.target.value)}
        />
        <button 
          className="submit-msg" 
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Generating...' : 'Submit 😊'}
        </button>

        {loading && (
          <div className="loading-spinner-container">
            <div className="loading-spinner"></div>
            <p>Generating your reflection...</p>
          </div>
        )}
      </div>

      {showModal && (
        <Modal 
          message="Please write something before submitting!" 
          onClose={closeModal} 
        />
      )}

      {showReflectionModal && reflection && (
        <Modal
          message={reflection}
          onClose={closeReflectionModal}
          isReflection={true}
        />
      )}
    </>
  );
}

export default Entry;