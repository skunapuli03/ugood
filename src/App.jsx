import {Link} from "react-router-dom";
import React, { useState, useEffect } from 'react';
import './App.css';
import { Analytics } from "@vercel/analytics/react";
import Navbar from "./navbar.jsx";
import { createClient } from '@supabase/supabase-js'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'

const supabase = createClient(
  'https://ggksgziwgftlyfngtolu.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdna3Nneml3Z2Z0bHlmbmd0b2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0NzI2MzYsImV4cCI6MjA1NTA0ODYzNn0.NsHJXXdtWV6PmdqqV_Q8pjmp9CXE23mTXYVRpPzt9M8'
);

function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session:', session); // Debug log
      setSession(session);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', session); // Debug log
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    //everything here becomes a condition statement
    //if logged in then show the journals w the lessons, and what if button, and generate new lesson buttons
    // include a small text area to the right of the screen to write a journal entry
    <>
      <Navbar session={session} />
      <div className="app-content">
        <h1 className="header">
          Oh hey you 👋🏾. Welcome to UGood, your personal journal. It helps you learn, grow, and meet people who overcame challenges like you😁
        </h1>
        
        <Link to="/entry">
          <button className='try-ugood'>
            Try UGood Free
          </button>
        </Link> 
      </div>
      <Analytics/>
    </>
  );
}

export default App;
