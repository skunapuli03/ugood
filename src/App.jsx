import {Link} from "react-router-dom";
import React, { useState, useEffect } from 'react';
import './App.css';
import { Analytics } from "@vercel/analytics/react";
import Navbar from "./navbar.jsx";
//importing necessary stuff for supabase authentication
import { createClient } from '@supabase/supabase-js'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
const supabase = createClient('https://ggksgziwgftlyfngtolu.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdna3Nneml3Z2Z0bHlmbmd0b2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0NzI2MzYsImV4cCI6MjA1NTA0ODYzNn0.NsHJXXdtWV6PmdqqV_Q8pjmp9CXE23mTXYVRpPzt9M8')

function App() {
  

  return (
    <>
      <h1 className="header">
        Oh hey you 👋🏾.Welcome to UGood, your personal journal. It helps you learn, grow, and meet people who overcame challenges like you😁
      </h1>
      
      <Link to ="/entry">
        <button className='try-ugood'>
          Try UGood Free
        </button>
      </Link> 

      <Analytics/>
      
    </>
  )
}

export default App;
