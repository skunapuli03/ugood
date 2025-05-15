import { Link } from "react-router-dom";
import React, { useState, useEffect } from 'react';
import './App.css';
import { Analytics } from "@vercel/analytics/react";
import Navbar from "./navbar.jsx";
import { createClient } from '@supabase/supabase-js';
import { motion } from "framer-motion";

// Supabase setup
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdna3Nneml3Z2Z0bHlmbmd0b2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0NzI2MzYsImV4cCI6MjA1NTA0ODYzNn0.NsHJXXdtWV6PmdqqV_Q8pjmp9CXE23mTXYVRpPzt9M8';
const supabaseUrl = "https://ggksgziwgftlyfngtolu.supabase.co";
const supabase = createClient(supabaseUrl, supabaseKey);

function App() {
  const [session, setSession] = useState(null);
  const [journals, setJournals] = useState([]);
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    const fetchSessionAndJournals = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);

        if (session && session.user) {
          fetchJournals(session.user.id); // Fetch journals for the logged-in user
        }
      } catch (error) {
        console.error("Error fetching session:", error);
      }
    };

    fetchSessionAndJournals();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session && session.user) {
        fetchJournals(session.user.id); // Fetch journals when session changes
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchUserCount = async () => {
      // Count distinct user_ids from journals table
      const { data, error, count } = await supabase
        .from('journals')
        .select('user_id', { count: 'exact', head: true });
      if (!error) setUserCount(count || 0);
    };
    fetchUserCount();
  }, []);

  const fetchJournals = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('journals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJournals(data || []);
    } catch (error) {
      console.error('Error fetching journals:', error);
    }
  };

  return (
    <>
      <Navbar session={session} />
        {session ? (
          // Show dashboard for logged-in users
          <main className="dashboard-layout">
            <div className="journals-container">
              {journals.length === 0 ? (
                <motion.div 
                  className="no-journals"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <motion.div 
                    className="welcome-card"
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <motion.h3 
                      className="welcome-title"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      ✨ Welcome to UGood!
                    </motion.h3>
                    
                    <motion.p 
                      className="welcome-message"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      Start your journaling journey today. Writing your thoughts and reflections can help you grow and improve every day.
                    </motion.p>

                    <motion.div 
                      className="tips-section"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                    >
                      <h4>Here are some tips to get started:</h4>
                      <div className="tips-grid">
                        <motion.div 
                          className="tip-card"
                          whileHover={{ scale: 1.05, backgroundColor: '#f0f7ff' }}
                        >
                          <span className="tip-emoji">📝</span>
                          <p>Write about your day and how you felt</p>
                        </motion.div>

                        <motion.div 
                          className="tip-card"
                          whileHover={{ scale: 1.05, backgroundColor: '#f0f7ff' }}
                        >
                          <span className="tip-emoji">💪</span>
                          <p>Reflect on challenges you faced and how you overcame them</p>
                        </motion.div>

                        <motion.div 
                          className="tip-card"
                          whileHover={{ scale: 1.05, backgroundColor: '#f0f7ff' }}
                        >
                          <span className="tip-emoji">🎯</span>
                          <p>Set goals for tomorrow and plan how to achieve them</p>
                        </motion.div>
                      </div>
                    </motion.div>

                    <motion.p 
                      className="inspiration-quote"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.8 }}
                    >
                      "Remember, journaling is a personal journey. There are no right or wrong entries. Just write what feels right for you." ✨
                    </motion.p>

                    <motion.div
                      className="start-button-container"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1 }}
                    >
                      <Link to="/entry" className="start-journey-btn">
                        Start Your Journey ✍️
                      </Link>
                    </motion.div>
                  </motion.div>
                </motion.div>
              ) : (
                <div className="journals-list">
                  {journals?.map(journal => (
                    <Link to={`/journal/${journal.id}`} style={{ textDecoration: "none" }}>
                      <motion.div
                        key={journal.id}
                        className="journal-card"
                        whileHover={{ scale: 1.03, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <p className="journal-preview">
                          {journal.content.substring(0, 90)}...
                        </p>
                        {journal.reflection && (
                          <div className="lesson-preview">
                            <p>{journal.reflection.substring(0, 75)}...</p>
                          </div>
                        )}
                        <span className="read-more-link">Read More ➡️</span>
                      </motion.div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <Link to="/entry" className="add-journal-btn">
              <motion.button
                className="add-journal-button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                
              </motion.button>
            </Link>
            <Link to="/entry" className="floating-add-btn" title="New Entry">
              <motion.button
                className="floating-add-btn-inner"
                whileHover={{ scale: 1.12 }}
                whileTap={{ scale: 0.95 }}
              >
                +
              </motion.button>
            </Link>
          </main>
        ) : (
          // Show landing page for non-logged-in users
          <div className="landing-page">
            <div className="landing-content">
              <div className="landing-content-top">
                <h1 className="slogan">
                  Journal your way to a Better You.
                </h1>
                <h2 className="description">
                  Discover the power of interactive journaling. Where your
                  past self guides your future growth. <br />
                  Write, reflect, and learn in real time as you transform your
                  thoughts into actionable insights. <br />
                  Embrace a two-way conversation that helps you grow every day.
                </h2>
                <p className="user-count-cta">
                  🌟 There are currently <motion.span className="user-count"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ ease: "easeInOut", duration: 0.5, type: "spring", stiffness: 50 }}
                >
                   4</motion.span> people journaling their way to growth!</p>
                <div className="onboard-buttons">
                  <Link to="/auth" state={journals}>
                    <motion.button className="landing-try-ugood" 
                    whileHover={{ scale: 1.05 }} 
                    whileTap={{ scale: 0.95 }}>
                      Start Journaling Now ➡️
                    </motion.button>
                  </Link>
                  <Link to="/about">
                    <motion.button className="landing-learn-more" whileHover={{ scale: 1.05 }} 
                    whileTap={{ scale: 0.95 }}>Learn More</motion.button>
                  </Link>
                </div>
              </div>

              <div className="ugood-how-it-works">
                <h3>How UGood Works</h3>
                <div className="how-it-works-grid">
                  {/* 1st column */}
                  <div className="how-it-works-card">
                    <div className="icon-placeholder">📔</div>
                    <h4>Daily Journaling</h4>
                    <p>Record your thoughts, feelings, and experiences.</p>
                  </div>

                  {/* 2nd column */}
                  <div className="how-it-works-card">
                    <div className="icon-placeholder">💬</div>
                    <h4>Reflective Conversations</h4>
                    <p>Chat with AI-generated versions of your past self.</p>
                    <h4>currently in the works*</h4>
                  </div>

                  {/* 3rd column */}
                  <div className="how-it-works-card">
                    <div className="icon-placeholder">📖</div>
                    <h4>Instant Lessons</h4>
                    <p>Instantly receive personalized advice to guide your journey.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      <Analytics />
    </>
  );
}

export default App;
