import {Link} from "react-router-dom";
import React, { useState, useEffect } from 'react';
import './App.css';
import { Analytics } from "@vercel/analytics/react";
import Navbar from "./navbar.jsx";
import { createClient } from '@supabase/supabase-js'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { motion } from "framer-motion";

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
                        <p><button onClick={() => fetchJournals()}> Journal Lesson </button>{journal.reflection.substring(0,10)}</p>
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
              <Link to="/entry" className="new-entry-btn">
                Write New Entry ✍️
              </Link>
            </main>
          </div>
        ) : (
          // Show landing page for non-logged in users
          <>
            <h1 className="header">
              Oh hey you 👋🏾. Welcome to UGood, your personal journal.
            </h1>
            <Link to="/entry">
              <button className='try-ugood'>
                Try UGood Free
              </button>
            </Link>
          </>
        )}
      </div>
      <Analytics/>
    </>
  );
}

export default App;
