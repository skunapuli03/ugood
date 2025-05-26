import React, { useReducer, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://ggksgziwgftlyfngtolu.supabase.co";
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdna3Nneml3Z2Z0bHlmbmd0b2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0NzI2MzYsImV4cCI6MjA1NTA0ODYzNn0.NsHJXXdtWV6PmdqqV_Q8pjmp9CXE23mTXYVRpPzt9M8';
const supabase = createClient(supabaseUrl, supabaseKey);

const initialState = {
  loading: true,
  error: null,
  resources: {
    articles: [],
    videos: [],
    books: [],
  },
};


console.log("we started the resources component");
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);

  useEffect(() => {
    const fetchResources = async () => {
      dispatch({ type: 'FETCH_START' });
      try {
        console.log("Fetching resources for user:", session?.user?.id);
        const res = await fetch('https://ugood-3osi.onrender.com/generate-resources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: session?.user?.id }),
        });
        const data = await res.json();
        dispatch({ type: 'FETCH_SUCCESS', payload: data });
      } catch (error) {
        dispatch({ type: 'FETCH_ERROR', error: 'Failed to load resources.' });
      }
    };
    if (session?.user?.id) fetchResources();
  }, [session]);

  const { loading, error, resources } = state;

  return (
    <div className="resources-page">
      <h2>Recommended Resources</h2>
      {loading && <p>Loading resources...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
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