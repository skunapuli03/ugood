import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import './entry.css';
import Navbar from './navbar';
import { Link } from 'react-router-dom';

const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdna3Nneml3Z2Z0bHlmbmd0b2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0NzI2MzYsImV4cCI6MjA1NTA0ODYzNn0.NsHJXXdtWV6PmdqqV_Q8pjmp9CXE23mTXYVRpPzt9M8';
const supabaseUrl = "https://ggksgziwgftlyfngtolu.supabase.co";
const supabase = createClient(supabaseUrl, supabaseKey);

// Reflection modal for viewing generated reflections
const ReflectionModal = ({ reflection, onClose }) => (
  <div className="modal-overlay">
    <div className="modal-content reflection-modal">
      <div className="reflection-header">
        <h3>✨ Your Lesson</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      <div className="reflection-body">{reflection}</div>
    </div>
  </div>
);

const Entry = ({ session }) => {
  const [localSession, setLocalSession] = useState(session);
  const [feeling, setFeeling] = useState('Neutral');
  const [journalText, setJournalText] = useState('');
  const [reflection, setReflection] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReflectionModal, setShowReflectionModal] = useState(false);

  // Re-fetch session if not provided via prop
  useEffect(() => {
    if (!localSession) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setLocalSession(session);
      });
    }
  }, [localSession]);

  const handleSaveEntry = async () => {
    if (!journalText.trim()) {
      alert('Please write something before saving.');
      return;
    }
    if (!localSession?.user?.id) {
      alert('Please log in first.');
      return;
    }
    setLoading(true);
    setReflection(''); // Clear any previous reflection
    try {
      // Call your reflection generation API
      const response = await fetch('http://localhost:9999/generate-reflections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journalEntry: journalText })
      });
      const data = await response.json();
      const generatedReflection = data?.reflection || '';

      // Save entry to Supabase
      const { error } = await supabase
        .from('journals')
        .insert([{
          user_id: localSession.user.id,
          feeling: feeling,
          content: journalText,
          reflection: generatedReflection,
          created_at: new Date().toISOString()
        }]);

      if (error) {
        console.error('Supabase insert error:', error);
        alert('Error saving journal entry.');
      } else {
        setReflection(generatedReflection);
        alert('Journal entry saved successfully!');
      }
    } catch (err) {
      console.error('Error saving entry:', err);
      alert('Error saving journal entry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar session={localSession} />
      <div className="journal-page">
        <div className="journal-header-row">
          <h1>Today's Journal</h1>
          <div className="date-display">{new Date().toLocaleDateString()}</div>
          <div> 
            <Link to = "/">
              <button> View Journals ➔</button>
            </Link>

          </div>
        </div>

        <div className="feeling-options">
          <h3>How are you feeling today?</h3>
          <div className="feeling-buttons">
            <button
              className={`feeling-btn ${feeling === 'Good' ? 'active' : ''}`}
              onClick={() => setFeeling('Good')}
              type="button"
            >
              Good 😊
            </button>
            <button
              className={`feeling-btn ${feeling === 'Neutral' ? 'active' : ''}`}
              onClick={() => setFeeling('Neutral')}
              type="button"
            >
              Normal 😐
            </button>
            <button
              className={`feeling-btn ${feeling === 'Not Great' ? 'active' : ''}`}
              onClick={() => setFeeling('Not Great')}
              type="button"
            >
              Not Great 😔
            </button>
          </div>
        </div>

        <textarea
          className="journal-input"
          placeholder="What's on your mind today?"
          value={journalText}
          onChange={(e) => setJournalText(e.target.value)}
        />

        <div className="button-row">
          <button
            className="view-lesson-btn"
            onClick={() => {
              if (reflection) setShowReflectionModal(true);
            }}
            disabled={!reflection}  // Disable button if no reflection
          >
            View Lesson
          </button>
          <button
            className="save-entry-btn"
            onClick={handleSaveEntry}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Entry'}
          </button>
        </div>

        {showReflectionModal && reflection && (
          <ReflectionModal
            reflection={reflection}
            onClose={() => setShowReflectionModal(false)}
          />
        )}
      </div>
    </>
  );
};

export default Entry;
