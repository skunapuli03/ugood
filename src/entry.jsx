import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import './entry.css';
import ReflectionCard from './ReflectionCard';
import { createClient } from '@supabase/supabase-js';
import ChatInterface from './ChatInterface';


const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdna3Nneml3Z2Z0bHlmbmd0b2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0NzI2MzYsImV4cCI6MjA1NTA0ODYzNn0.NsHJXXdtWV6PmdqqV_Q8pjmp9CXE23mTXYVRpPzt9M8'
const supabaseUrl = "https://ggksgziwgftlyfngtolu.supabase.co"
const supabase = createClient(supabaseUrl, supabaseKey)

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

//only works when session = true, means user is logged in
function Entry({ session }) { // Fix: Destructure session prop
  const [journalText, setJournalText] = useState('');
  const [loading, setLoading] = useState(false);
  const [reflection, setReflection] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [showSignUpPrompt, setShowSignUpPrompt] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatHistory, setChatHistory] = useState([]); // Fix: Initialize as array
  const [selectedJournal, setSelectedJournal] = useState(null);
  const [journals, setJournals] = useState([]); // Fix: Initialize as array

  const closeModal = () => setShowModal(false);
  const closeReflectionModal = () => setShowReflectionModal(false);
  //fetching journals if the user is logged in
  useEffect(() => {
    if (session){
      fetchJournals();
    }
  }, [session]);

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

      if (session) {
        await supabase.from('journals').insert([{
          user_id: session.user.id,
          content: journalText,
          reflection: data.reflection,
          created_at: new Date().toISOString()
        }]);
        fetchJournals(); // Refresh journals after adding new one
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

  //handling+logic for the 'what-if' btn
  const handleWhatIf = async (journalId) => {
    try {
      const journal = journals.find(j => j.id === journalId);
      if (!journal) return;
      
      setLoading(true);
      setSelectedJournal(journal);

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
        content: "Based on your journal, let's explore what could have been different.",
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

  return (
    <div className="dashboard-layout">
      {/* Left Sidebar */}
      <aside className="journals-sidebar">
        <h2>Your Journals</h2>
        <div className="journals-list">
          {journals?.map(journal => (
            <motion.div 
              key={journal.id}
              className="journal-card"
            >
              <p className="journal-preview">
                {journal.content.substring(0, 10)}...
              </p>
              {journal.reflection && (
                <div className="lesson-preview">
                  <p>{journal.reflection.substring(0,10)}</p>
                  <button 
                    onClick={() => handleWhatIf(journal.id)}
                    className="what-if-btn"
                  >
                    What If? 🤔
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </aside>

      {/* Main Content */}
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
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? 'Generating...' : 'Reflect 😊'}
              </button>

              {loading && (
                <div className="loading-spinner-container">
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
          </div>
        )}
      </main>

      {/* Modals */}
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
