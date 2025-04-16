import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useSearchParams, useNavigate } from 'react-router-dom';

const supabase = createClient(
  "https://ggksgziwgftlyfngtolu.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdna3Nneml3Z2Z0bHlmbmd0b2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0NzI2MzYsImV4cCI6MjA1NTA0ODYzNn0.NsHJXXdtWV6PmdqqV_Q8pjmp9CXE23mTXYVRpPzt9M8"
);

function EmailConfirmation() {
  const [status, setStatus] = useState('Verifying your email...');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        // Get the token_hash and type from URL
        const token_hash = searchParams.get('token_hash');
        const type = searchParams.get('type');

        if (!token_hash || type !== 'signup') {
          setStatus('Invalid confirmation link');
          return;
        }

        // Verify the email
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: 'signup'
        });

        if (error) {
          console.error('Error confirming email:', error.message);
          setStatus(`Error: ${error.message}`);
        } else {
          setStatus('🎉 Email confirmed successfully! Redirecting...');
          setTimeout(() => {
            navigate('/auth');
          }, 3000);
        }
      } catch (err) {
        console.error('Error:', err);
        setStatus('An unexpected error occurred');
      }
    };

    confirmEmail();
  }, [searchParams, navigate]);

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
      <h1 style={{ marginBottom: '1rem', color: '#007aff' }}>Email Confirmation</h1>
      <p style={{ marginBottom: '1rem' }}>{status}</p>
    </div>
  );
}

export default EmailConfirmation;