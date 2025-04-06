import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

// Supabase setup
const supabase = createClient(
  "https://ggksgziwgftlyfngtolu.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdna3Nneml3Z2Z0bHlmbmd0b2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0NzI2MzYsImV4cCI6MjA1NTA0ODYzNn0.NsHJXXdtWV6PmdqqV_Q8pjmp9CXE23mTXYVRpPzt9M8"
);

function ResetPasswordConfirmation() {
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('Verifying your reset link...');
  const [sessionVerified, setSessionVerified] = useState(false); // Track if session is verified
  const [isPasswordReset, setIsPasswordReset] = useState(false); // Track if password reset is in progress
  const navigate = useNavigate();

  useEffect(() => {
    const initSession = async () => {
      const params = new URLSearchParams(window.location.search);
      const type = params.get('type');
      const code = params.get('code');

      if (type !== 'recovery' || !code) {
        console.error("Invalid or missing reset link parameters.");
        setStatus("Invalid or expired reset link. Please request a new password reset.");
        return;
      }

      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (error) {
          console.error("Error exchanging code for session:", error);
          setStatus("Failed to verify reset link. Please try again.");
        } else {
          setSessionVerified(true); // Session is verified
          setStatus(''); // Clear the status message
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setStatus("An unexpected error occurred. Please try again.");
      }
    };

    initSession();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setStatus('🎉 Password updated! Redirecting...');
      setIsPasswordReset(true); // Mark password reset as complete
      setTimeout(() => navigate('/'), 3000);
    } catch (err) {
      setStatus(`😔 ${err.message}`);
    }
  };

  return (
    <div>
      <h1>Reset Your Password</h1>
      {status && <p>{status}</p>}
      {sessionVerified && !isPasswordReset ? (
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
      ) : sessionVerified && isPasswordReset ? (
        <p>Password reset successfully! Redirecting...</p>
      ) : (
        <p>Verifying your reset link...</p>
      )}
    </div>
  );
}

export default ResetPasswordConfirmation;
