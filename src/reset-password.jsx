import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';

const supabase = createClient(
  "https://ggksgziwgftlyfngtolu.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdna3Nneml3Z2Z0bHlmbmd0b2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0NzI2MzYsImV4cCI6MjA1NTA0ODYzNn0.NsHJXXdtWV6PmdqqV_Q8pjmp9CXE23mTXYVRpPzt9M8"
);

function ResetPassword() {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [status, setStatus] = useState('');
  const navigate = useNavigate();

  const handleResetRequest = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;
      setStatus('Password reset link has been sent to your email!');
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      
      setStatus('Password updated successfully! Redirecting...');
      setTimeout(() => {
        navigate('/auth');
      }, 3000);
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
  };

  // Check if we're on the reset page (has access_token)
  const isResetPage = window.location.hash.includes('access_token');

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
      <h1 style={{ marginBottom: '1rem', color: '#007aff' }}>Reset Password</h1>
      {status && <p style={{ marginBottom: '1rem' }}>{status}</p>}

      {!isResetPage ? (
        // Step 1: Request password reset
        <form onSubmit={handleResetRequest}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              marginBottom: '1rem',
              borderRadius: '4px',
              border: '1px solid #ccc'
            }}
            required
          />
          <button
            type="submit"
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#007aff',
              color: '#fff',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Send Reset Link
          </button>
        </form>
      ) : (
        // Step 2: Set new password
        <form onSubmit={handlePasswordUpdate}>
          <input
            type="password"
            placeholder="Enter new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              marginBottom: '1rem',
              borderRadius: '4px',
              border: '1px solid #ccc'
            }}
            required
          />
          <button
            type="submit"
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#007aff',
              color: '#fff',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Update Password
          </button>
        </form>
      )}
    </div>
  );
}

export default ResetPassword;
