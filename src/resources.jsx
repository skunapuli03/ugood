import React, { useReducer, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://ggksgziwgftlyfngtolu.supabase.co";
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdna3Nneml3Z2Z0bHlmbmd0b2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0NzI2MzYsImV4cCI6MjA1NTA0ODYzNn0.NsHJXXdtWV6PmdqqV_Q8pjmp9CXE23mTXYVRpPzt9M8';
const supabase = createClient(supabaseUrl, supabaseKey);
console.log("we started the resources component");

// Initial state for the reducer
const initialState = {
  loading: true,
  error: null,
  resources: {
    articles: [],
    videos: [],
    books: [],
  },
};

// Reducer function to manage state
function reducer(state, action) {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, resources: action.payload };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.error };
    default:
      return state;
  }
}

function Resources() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [session, setSession] = useState(null);

  // Fetch the session from Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Session fetched:", session); // Debug log
      setSession(session);
    });
  }, []);

  // Fetch resources from the backend
  useEffect(() => {
    const fetchResources = async () => {
      dispatch({ type: 'FETCH_START' });
      try {
        console.log("Fetching resources for user:", session?.user?.id); // Debug log
        const res = await fetch('https://ugood-3osi.onrender.com/generate-resources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: session?.user?.id }),
        });

        if (!res.ok) {
          throw new Error(`API error: ${res.status}`);
        }

        const data = await res.json();
        console.log("Resources fetched:", data); // Debug log

        if (!data || !data.articles || !data.videos || !data.books) {
          throw new Error("Invalid response format");
        }

        dispatch({ type: 'FETCH_SUCCESS', payload: data });
      } catch (error) {
        console.error("Error fetching resources:", error); // Debug log
        dispatch({ type: 'FETCH_ERROR', error: 'Failed to load resources.' });
      }
    };

    if (session?.user?.id) {
      console.log("Session is valid, triggering fetch..."); // Debug log
      fetchResources();
    } else {
      console.log("No session or user ID available."); // Debug log
    }
  }, [session]);

  const { loading, error, resources } = state;

  return (
    <div className="resources-page">
      <h2>Recommended Resources</h2>
      {loading && <p>Loading resources...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && !error && resources.articles.length === 0 && resources.videos.length === 0 && resources.books.length === 0 && (
        <p>No resources found. Please add more journal entries to get recommendations.</p>
      )}
      {!loading && !error && (
        <>
          <h3>Articles</h3>
          <ul>
            {resources.articles.map((item, idx) => (
              <li key={idx}>
                <a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a>
              </li>
            ))}
          </ul>
          <h3>Videos</h3>
          <ul>
            {resources.videos.map((item, idx) => (
              <li key={idx}>
                <a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a>
              </li>
            ))}
          </ul>
          <h3>Books</h3>
          <ul>
            {resources.books.map((item, idx) => (
              <li key={idx}>
                <a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a>
              </li>
            ))}
          </ul>
        </>
      )}
      <br />
      <Link to="/entry">
        <button className="try-ugood">
          Try UGood Free
        </button>
      </Link>
    </div>
  );
}

export default Resources;