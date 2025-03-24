import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

// Supabase setup
const supabase = createClient("https://ggksgziwgftlyfngtolu.supabase.co", "YOUR_SUPABASE_KEY");

function ResetPasswordConfirmation() {
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Automatically grabs session from URL when page loads
    const initSession = async () => {
      const { error } = await supabase.auth.getSessionFromUrl();
      if (error) console.error("Error getting session from URL:", error);
    };
    initSession();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setStatus('🎉 Password updated! Redirecting...');
      setTimeout(() => navigate('/'), 3000);
    } catch (err) {
      setStatus(`😔 ${err.message}`);
    }
  };

  return (
    <div>
      <h1>Reset Your Password</h1>
      {status && <p>{status}</p>}
      <form onSubmit={handleSubmit}>
        <input 
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Set New Password</button>
      </form>
    </div>
  );
}

export default ResetPasswordConfirmation;
