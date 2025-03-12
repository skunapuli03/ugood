import {Link} from "react-router-dom";
import React, { useState, useEffect } from 'react';
import './App.css';
import { Analytics } from "@vercel/analytics/react";
import Navbar from "./navbar.jsx";
import { createClient } from '@supabase/supabase-js'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { motion } from "framer-motion";
//REFER TO AUTH.JSX TO MAKE SURE YOU GET JOURNAL HISTORY, SO WHEN USER IS LOGGED IN THEY CAN GET THEIR CONTENT
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdna3Nneml3Z2Z0bHlmbmd0b2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0NzI2MzYsImV4cCI6MjA1NTA0ODYzNn0.NsHJXXdtWV6PmdqqV_Q8pjmp9CXE23mTXYVRpPzt9M8'
const supabaseUrl = "https://ggksgziwgftlyfngtolu.supabase.co"
const supabase = createClient(supabaseUrl, supabaseKey)

function App() {
  const [session, setSession] = useState(null);
  const [journals, setJournals] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
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
    }
  };

  return (
    <>
      <Navbar session={session} />
      <div className="app-content">
        {session ? (
          // Show dashboard for logged in users
          <div className="dashboard-layout">
            {/* Left Sidebar */}
            <aside className="journals-sidebar">
              <h2>Your Journal History</h2>
              <div className="journals-list">
                {journals?.map(journal => (
                  <motion.div 
                    key={journal.id}
                    className="journal-card"
                  >
                    <p className="journal-preview"> <button> Journal Entry </button>
                      {journal.content.substring(0, 10)}...
                    </p>
                    {journal.reflection && (
                      <div className="lesson-preview">
                        <p><button > Journal Lesson </button>{journal.reflection.substring(0,10)}</p>
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
              <Link to="/auth" className="new-entry-btn">
                Write New Entry ✍️
              </Link>
            </main>
          </div>
        ) : (
          // Show landing page for non-logged in users
          <>
          <div className="landing-content">
            <div className = "landing-content-top">
              <h1 className="slogan">
                Journal your way to <br/>better self-<br/>understanding.
              </h1>
              <h2 className="description">
                Learn from your past self and gain insighs <br />
                into you personal growth journey.
                
              </h2>
              <Link to="/auth" state = {journals}>
                <button className="landing-try-ugood" >
                  Start Journaling Now ➡️
                </button>
              </Link>
              <Link to="/about">
                <button className="landing-learn-more" >Learn More</button>
              </Link>
          </div>
            
        <div className="ugood-how-it-works">
          <h3>How UGood Works</h3>
          <div className="how-it-works-grid">

            {/* 1st column */}
            <div className="how-it-works-card">
              {/* Replace with an icon, or a real image if you have one */}
              <div className="icon-placeholder">📔</div> 
              <h4>Daily Journaling</h4>
              <p>Record your thoughts, feelings, and experiences.</p>
            </div>

            {/* 2nd column */}
            <div className="how-it-works-card">
              <div className="icon-placeholder">💬</div>
              <h4>Reflective Conversations</h4>
              <p>Chat with AI-generated versions of your past self.</p>
            </div>

            {/* 3rd column */}
            <div className="how-it-works-card">
              <div className="icon-placeholder">📈</div>
              <h4>Growth Insights</h4>
              <p>Visualize patterns and track your personal development.</p>
            </div>

          </div>
        </div>
      </div>
            </>
          )}
      </div>
      <Analytics/>
    </>
  );
}

export default App;
