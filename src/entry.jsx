import React, { useState } from 'react';
import { motion } from 'framer-motion';
import './entry.css';
import ReflectionCard from './ReflectionCard';

function Entry() {
  const [journalText, setJournalText] = useState('');
  const [loading, setLoading] = useState(false);
  const [reflection, setReflection] = useState('');
  const [showReflection, setShowReflection] = useState(false);

  const handleSubmit = async () => {
    if (!journalText.trim()) {
      alert('Please write something before submitting!');
      return;
    }

    // If reflection already exists, just show it
    if (reflection) {
      setShowReflection(true);
      return;
    }

    setLoading(true);
    try {
      // Generate reflection from Gemini
      const response = await fetch('http://localhost:9999/generate-reflections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journalEntry: journalText }),
      });
      const data = await response.json();
      setReflection(data.reflection);

      // Save the generated lesson to your backend so you can retrieve it later
      await fetch('http://localhost:9999/api/save-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journalEntry: journalText, reflection: data.reflection })
      });

      setShowReflection(true);
    } catch (error) {
      console.error('Error generating reflection or tasks with Gemini:', error);
      alert('Failed to generate reflection!');
    } finally {
      setLoading(false);
    }
  };

  // Retrieves the saved lesson from your backend
  const handleViewLesson = async () => {
    try {
      const res = await fetch('http://localhost:9999/api/get-lesson', {
        method: 'GET'
      });
      const data = await res.json();
      if (data && data.reflection) {
        setReflection(data.reflection);
        setShowReflection(true);
      }
    } catch (error) {
      console.error('Error retrieving lesson:', error);
      alert('Failed to retrieve lesson!');
    }
  };

  // Toggle back to journal entry view
  const handleShowJournal = () => {
    setShowReflection(false);
  };

  return (
    <div className="entry-container">
      {!showReflection && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          className="journal-entry-container"
        >
          <h2 className="journal-title">📝 Journal Entry</h2>
          <textarea
            className="journal-input"
            placeholder="Your thoughts, feelings, or observations"
            value={journalText}
            onChange={(e) => {
              setJournalText(e.target.value);
              // Clear the reflection if the journal text is modified
              if (reflection) setReflection('');
            }}
          />
          <button className="submit-msg" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Generating...' : 'Reflect 😊'}
          </button>
        </motion.div>
      )}

      {showReflection && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="reflection-container"
        >
          <ReflectionCard reflection={reflection} />
          <button className="submit-msg" onClick={handleShowJournal}>
            View Journal Entry
          </button>
          

        </motion.div>
      )}
    </div>
  );
}

export default Entry;