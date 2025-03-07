import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './entry.css';
import ReflectionCard from './ReflectionCard';
import ChatInterface from './ChatInterface';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdna3Nneml3Z2Z0bHlmbmd0b2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0NzI2MzYsImV4cCI6MjA1NTA0ODYzNn0.NsHJXXdtWV6PmdqqV_Q8pjmp9CXE23mTXYVRpPzt9M8';
const supabaseUrl = "https://ggksgziwgftlyfngtolu.supabase.co";
const supabase = createClient(supabaseUrl, supabaseKey);

//
// Modal Component for Alerts & Reflections
//
const Modal = ({ message, onClose, isReflection = false }) => (
  <div className="modal-overlay">
    <div className={`modal-content ${isReflection ? 'reflection-modal' : ''}`}>
      {isReflection ? (
        <>
          <div className="reflection-header">
            <h3>✨ Your Reflection</h3>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
          <div className="reflection-body">{message}</div>
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

//
// Main Entry Component – Only works when session (user is logged in) is true
//
function Entry({ session }) {
  // State declarations
  const [journalText, setJournalText] = useState('');
  const [loading, setLoading] = useState(false);
  const [reflection, setReflection] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [showSignUpPrompt, setShowSignUpPrompt] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [selectedJournal, setSelectedJournal] = useState(null);
  const [journals, setJournals] = useState([]);

  // Close modal helper functions
  const closeModal = () => setShowModal(false);
  const closeReflectionModal = () => setShowReflectionModal(false);

  // Fetch journals when session is available
  useEffect(() => {
    if (session) {
      fetchJournals();
    }
  }, [session]);

  // Function to fetch journals for the logged-in user
  const fetchJournals = async () => {
    try {
      const { data, error } = await supabase
        .from('journals')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setJournals(data || []);
    } catch (error) {
      console.error('Error fetching journals:', error);
      setShowModal(true);
    }
  };

  // Helper: Group journals by the date portion of created_at
  const groupJournalsByDate = (journalsArray) => {
    return journalsArray.reduce((groups, journal) => {
      // Get date string (e.g., "7/20/2023")
      const dateKey = new Date(journal.created_at).toLocaleDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(journal);
      return groups;
    }, {});
  };

  // Handle journal submission: Generate reflection, insert journal, and update state
  const handleSubmit = async () => {
    if (!journalText.trim()) {
      setShowModal(true);
      return;
    }
    setLoading(true);
    setReflection('');
    setShowReflectionModal(false);
    try {
      // Call your API to generate a reflection for the journal entry
      const response = await fetch('http://localhost:9999/generate-reflections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journalEntry: journalText }),
      });
      const data = await response.json();
      setReflection(data.reflection);

      // Insert new journal entry into Supabase
      const { data: newJournal, error } = await supabase
        .from('journals')
        .insert([{
          user_id: session.user.id,
          content: journalText,
          reflection: data.reflection,
          created_at: new Date().toISOString()
        }]);
      
      // Update state using the new journal entry returned from Supabase
      if (!error && session && newJournal && newJournal.length) {
        setJournals(prevJournals => [newJournal[0], ...prevJournals]);
      } else {
        setShowSignUpPrompt(true);
      }
    } catch (error) {
      console.error('Error:', error);
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  };

  // Handle "What If?" logic to start conversation with past self
  const handleWhatIf = async (journalId) => {
    try {
      const journal = journals.find(j => j.id === journalId);
      if (!journal) return;
      setLoading(true);
      setSelectedJournal(journal);
      // Call your API for a "what-if" scenario prompt
      const response = await fetch('http://localhost:9999/generate-reflections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          journalEntry: journal.content,
          type: 'what-if-start'
        })
      });
      const data = await response.json();
      setChatHistory([{
        type: 'ai',
        content: "Based on your journal, let's explore what could have been different. Ask if there's something that could've been changed.",
        timestamp: new Date().toISOString()
      }]);
      setShowChat(true);
    } catch (error) {
      console.error('Error:', error);
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  };

  // Group journals by date for the sidebar
  const groupedJournals = groupJournalsByDate(journals);

  return (
    <div className="dashboard-layout">
      {/* Sidebar: Group journals by date */}
      <aside className="journals-sidebar">
        <h2>Your Journals</h2>
        <div className="journals-list">
          {Object.keys(groupedJournals).map(date => (
            <div key={date} className="journal-date-group">
              {/* Date header for each group */}
              <h3 className="date-header">{date}</h3>
              {groupedJournals[date].map(journal => (
                <motion.div 
                  key={journal.id}
                  className="journal-card"
                  onClick={() => setSelectedJournal(journal)} // Open detailed view on click
                  whileHover={{ scale: 1.02 }}
                >
                  <p className="journal-preview">
                    {journal.content.substring(0, 10)}...
                  </p>
                  {journal.reflection && (
                    <div className="lesson-preview">
                      <p>{journal.reflection.substring(0, 10)}</p>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleWhatIf(journal.id); }}
                        className="what-if-btn"
                      >
                        What If? 🤔
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content: Journal Entry Form or Chat Interface */}
      <main className="main-content">
        {showChat ? (
          <ChatInterface 
            journal={selectedJournal}
            onClose={() => setShowChat(false)}
            session={session}
          />
        ) : (
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
                onClick={reflection ? () => setShowReflectionModal(true) : handleSubmit}
                disabled={loading}
              >
                {loading ? 'Generating...' : reflection ? 'View Lesson' : 'Reflect 😊'}
              </button>
            </motion.div>
            <motion.div
              initial={{ x: '100%', opacity: 0 }} 
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.2, ease: 'easeInOut' }}
              className="reflection-container"
            >
              {reflection && <ReflectionCard reflection={reflection} />}
            </motion.div>
          </div>
        )}
      </main>

      {/* Detailed View Overlay for Selected Journal */}
      <AnimatePresence>
        {selectedJournal && (
          <motion.div
            className="detail-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="detail-container"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
            >
              <button className="close-detail" onClick={() => setSelectedJournal(null)}>✕</button>
              <h2 className="detail-title">Journal Entry</h2>
              {/* Display full creation date and time */}
              <p className="entry-date">
                {new Date(selectedJournal.created_at).toLocaleString()}
              </p>
              {/* Full journal content */}
              <div className="full-entry">
                {selectedJournal.content}
              </div>
              {selectedJournal.reflection && (
                <>
                  <h3>Lesson</h3>
                  <div className="full-lesson">
                    {selectedJournal.reflection}
                  </div>
                </>
              )}
              <button
                className="converse-btn"
                onClick={() => alert("Initiating conversation with your past self!")}
              >
                Converse with Your Past Self
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals for alerts and reflection display */}
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
