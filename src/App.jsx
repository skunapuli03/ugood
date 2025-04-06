import {Link} from "react-router-dom";
import React, { useState, useEffect } from 'react';
import './App.css';
import { Analytics } from "@vercel/analytics/react";
import Navbar from "./navbar.jsx";
import { createClient } from '@supabase/supabase-js'
import { motion } from "framer-motion";
//REFER TO AUTH.JSX TO MAKE SURE YOU GET JOURNAL HISTORY, SO WHEN USER IS LOGGED IN THEY CAN GET THEIR CONTENT
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdna3Nneml3Z2Z0bHlmbmd0b2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0NzI2MzYsImV4cCI6MjA1NTA0ODYzNn0.NsHJXXdtWV6PmdqqV_Q8pjmp9CXE23mTXYVRpPzt9M8'
const supabaseUrl = "https://ggksgziwgftlyfngtolu.supabase.co"
const supabase = createClient(supabaseUrl, supabaseKey)
console.log(import.meta.env.VITE_SUPABASE_ANON_URL);
function App() {
  const [session, setSession] = useState();
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
          <main className="dashboard-layout">
            <div className="journals-container">
              <div className="journal-header">
                <h2 className="journal-header-text">Your Journals</h2>
                <div className="journals-actions">
                  <Link to="/entry" state={{ session }} className="new-entry-btn" >
                    Write New Entry ✍️
                  </Link>
                </div>
              </div>
              {journals.length === 0 ? (
                <div className="no-journals">
                  <h3>Welcome to UGood!</h3>
                  <p>Start your journaling journey today. Writing your thoughts and reflections can help you grow and improve every day.</p>
                  <p>Here are some tips to get started:</p>
                  <ul>
                    <li>Write about your day and how you felt.</li>
                    <li>Reflect on any challenges you faced and how you overcame them.</li>
                    <li>Set goals for tomorrow and plan how to achieve them.</li>
                  </ul>
                  <p>Remember, journaling is a personal journey. There are no right or wrong entries. Just write what feels right for you.</p>
                  
                </div>
              ) : (
            
              <div className="journals-list">
                {journals?.map(journal => (
                  <motion.div 
                    key={journal.id}
                    className="journal-card"
                  >
                    
                    <p className="journal-preview"> 
                      {journal.content.substring(0, 90)}...
                    </p>
                    {journal.reflection && (
                      <div className="lesson-preview">
                        <p>{journal.reflection.substring(0,75)}...</p>
                      </div>
                    )}
                    <Link to={`/journal/${journal.id}`} className="read-more-link">
                      Read More ➡️
                    </Link>  
                  </motion.div>
                ))}
              </div>
              )}
            </div>
            </main>


        ) : (
          // Show landing page for non-logged in users
          <>
          <div className="landing-content">
            <div className = "landing-content-top">
              <h1 className="slogan">
                Journal your way to a Better You.
              </h1>
              <h2 className="description">
              Discover the power of interactive journaling—where your 
              past self guides your future growth. <br/>
              Write, reflect, and learn in real time as you transform your 
              thoughts into actionable insights. <br/>
              Embrace a two-way conversation that helps you grow every day.               
              </h2>
              <div className="onboard-buttons">
                <Link to="/auth" state = {journals}>
                  <button className="landing-try-ugood" >
                    Start Journaling Now ➡️
                  </button>
                </Link>
                <Link to="/about">
                  <button className="landing-learn-more" >Learn More</button>
                </Link>
              </div>  
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
            </>
          )}
      </div>
      <Analytics/>
    </>
  );
}

export default App;
