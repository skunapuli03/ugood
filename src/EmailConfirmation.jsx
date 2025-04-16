import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useSearchParams, useNavigate } from 'react-router-dom';

// Supabase setup
const supabase = createClient(
  "https://ggksgziwgftlyfngtolu.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdna3Nneml3Z2Z0bHlmbmd0b2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0NzI2MzYsImV4cCI6MjA1NTA0ODYzNn0.NsHJXXdtWV6PmdqqV_Q8pjmp9CXE23mTXYVRpPzt9M8"
);

function EmailConfirmation() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [status, setStatus] = useState('');
  const [step, setStep] = useState(1); // Step 1: Send OTP, Step 2: Verify OTP
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Extract email from query parameters if available
    const emailFromParams = searchParams.get('email');
    if (emailFromParams) {
      setEmail(emailFromParams);
      setStep(2); // Skip to OTP entry if email is provided
    }
  }, [searchParams]);

  // Function to send OTP
  const sendOtp = async () => {
    setStatus('Sending OTP...');
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true, // Allow sign-up
      },
    });

    if (error) {
      console.error('Error sending OTP:', error.message);
      setStatus(`Error: ${error.message}`);
    } else {
      console.log('OTP sent successfully:', data);
      setStatus('OTP sent successfully. Please check your email.');
      setStep(2); // Move to Step 2: Verify OTP
    }
  };

  // Function to verify OTP
  const verifyOtp = async () => {
    setStatus('Verifying OTP...');
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'signup', // Specify the type as 'signup' for sign-up OTP
    });

    if (error) {
      console.error('Error verifying OTP:', error.message);
      setStatus(`Error: ${error.message}`);
    } else {
      console.log('OTP verified successfully:', data);
      setStatus('🎉 Sign-up and email verification successful!');
      setTimeout(() => {
        window.close(); // Close the page after success
      }, 3000);
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
      <h1 style={{ marginBottom: '1rem', color: '#007aff' }}>Email Confirmation</h1>
      <p style={{ marginBottom: '1rem' }}>{status}</p>

      {step === 1 && (
        <>
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
              border: '1px solid #ccc',
            }}
          />
          <button
            onClick={sendOtp}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#007aff',
              color: '#fff',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Send OTP
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <p>Please enter the OTP sent to your email: <strong>{email}</strong></p>
          <input
            type="text"
            placeholder="Enter the OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              marginBottom: '1rem',
              borderRadius: '4px',
              border: '1px solid #ccc',
            }}
          />
          <button
            onClick={verifyOtp}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#007aff',
              color: '#fff',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Verify OTP
          </button>
        </>
      )}
    </div>
  );
}

export default EmailConfirmation;