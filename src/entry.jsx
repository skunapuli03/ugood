import React, { useState } from 'react';
import { motion } from 'framer-motion';
import './entry.css';
import ReflectionCard from './ReflectionCard';

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
    <div className="entry-container">
      <motion.div 
        initial={{ x: 0 }}
        animate={{ x: -100 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        className={`journal-entry-container ${showReflectionModal ? 'minimized' : ''}`}
      >
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
      </motion.div>

      <motion.div
        initial={{ x: '100%', opacity: 0 }} 
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.2, ease: 'easeInOut' }}
        className="reflection-container"
      >
        {reflection && <ReflectionCard reflection={reflection} />}
      </motion.div>

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
    </div>
  );
}

export default Entry;