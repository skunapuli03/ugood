import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

// Supabase setup
const supabase = createClient(
  "https://ggksgziwgftlyfngtolu.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdna3Nneml3Z2Z0bHlmbmd0b2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0NzI2MzYsImV4cCI6MjA1NTA0ODYzNn0.NsHJXXdtWV6PmdqqV_Q8pjmp9CXE23mTXYVRpPzt9M8"
);

function EmailConfirmation() {
  const [status, setStatus] = useState('Verifying your email...');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const verifyEmail = async () => {
      const type = searchParams.get('type');
      const accessToken = searchParams.get('access_token');

      console.log('Type:', type); // Debugging log
      console.log('Access Token:', accessToken); // Debugging log

      if (type !== 'signup' || !accessToken) {
        setStatus('Invalid or missing confirmation link. Redirecting...');
        setTimeout(() => navigate('/'), 10000);
        return;
      }

      try {
        const { error } = await supabase.auth.verifyOtp({
          type: 'signup',
          token: accessToken,
          email: searchParams.get('email'),
        });

        if (error) {
          console.error('Error verifying email:', error.message);
          setStatus('Failed to verify email. Please try again.');
        } else {
          setStatus('🎉 Your email has been confirmed successfully!');
          setTimeout(() => navigate('/auth'), 3000); // Redirect to login page after 3 seconds
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setStatus('An unexpected error occurred. Please try again.');
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  return (
    <div style={{
      maxWidth: '500px',
      margin: '4rem auto',
      padding: '2rem',
      borderRadius: '8px',
    }}>
      <h1 style={{ marginBottom: '1rem', color: '#007aff' }}>Email Confirmation</h1>
      <p style={{ marginBottom: '1rem' }}>{status}</p>
      <button
        onClick={() => navigate('/')}
        style={{
          marginTop: '1rem',
          padding: '0.5rem 1rem',
          backgroundColor: '#007aff',
          color: '#fff',
          borderRadius: '4px',
          border: 'none',
          cursor: 'pointer'
        }}
      >
        Go to Homepage
      </button>
    </div>
  );
}

export default EmailConfirmation;