import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

function EmailConfirmation() {
  const [status, setStatus] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if the type query parameter is 'signup'
    if (searchParams.get('type') !== 'signup') {
      navigate('/');
    } else {
      setStatus('🎉 Your email has been confirmed successfully!');
      // Redirect after 3 seconds
      
  
    }
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
      <h1 style={{ marginBottom: '1rem', color: '#007aff' }}>Email Confirmed</h1>
      <p style={{ marginBottom: '1rem' }}>{status}</p>
      <button onClick={() => navigate('/')} style={{ marginTop: '1rem', padding: '0.5rem 1rem', backgroundColor: '#007aff', color: '#fff', borderRadius: '4px' }}>
        Go to Homepage
      </button>
    </div>
  );
}

export default EmailConfirmation;