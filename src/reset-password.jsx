import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL; // or your hardcoded URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY; // or your key

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
function ResetPasswordConfirmation() {
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Ensure the link is really for recovery; otherwise, redirect home
  useEffect(() => {
    if (searchParams.get('type') !== 'recovery') {
      navigate('/');
    }
  }, [searchParams, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
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