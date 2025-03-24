import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdna3Nneml3Z2Z0bHlmbmd0b2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0NzI2MzYsImV4cCI6MjA1NTA0ODYzNn0.NsHJXXdtWV6PmdqqV_Q8pjmp9CXE23mTXYVRpPzt9M8'
const supabaseUrl = "https://ggksgziwgftlyfngtolu.supabase.co";
const supabase = createClient(supabaseUrl, supabaseKey);

function ResetPasswordConfirmation() {
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // When the component mounts, verify it's a recovery link and set the session
  useEffect(() => {
    // Ensure the link is for recovery; otherwise, redirect home
    if (searchParams.get('type') !== 'recovery') {
      navigate('/');
      return;
    }

    // This call parses the URL to update the current session with the recovery token
    const initSession = async () => {
      const { error } = await supabase.auth.getSessionFromUrl();
      if (error) {
        console.error("Error getting session from URL:", error);
      }
    };

    initSession();
  }, [searchParams, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // updateUser will now have a valid session from the recovery token
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setStatus('🎉 Your password has been updated successfully!');
      // Optionally, redirect the user after a delay
      setTimeout(() => navigate('/'), 3000);
    } catch (err) {
      setStatus(`😔 ${err.message}`);
    }
  };

  return (
    <div style={{
      maxWidth: '500px',
      margin: '4rem auto',
      padding: '2rem',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      textAlign: 'center',
      fontFamily: 'Inter, sans-serif',
      backgroundColor: '#fff'
    }}>
      <h1 style={{ marginBottom: '1rem', color: '#007aff' }}>Reset Your Password</h1>
      {status && <p style={{ marginBottom: '1rem' }}>{status}</p>}
      <form onSubmit={handleSubmit}>
        <input 
          type="password"
          placeholder="Enter new password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            width: '100%',
            padding: '12px',
            marginBottom: '1rem',
            borderRadius: '4px',
            border: '1px solid #ccc',
            fontSize: '1rem'
          }}
        />
        <button 
          type="submit"
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#007aff',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '1rem',
            cursor: 'pointer'
          }}
        >
          Set New Password
        </button>
      </form>
    </div>
  );
}

export default ResetPasswordConfirmation;
