import React, { useReducer, useEffect } from 'react';
import { Link } from 'react-router-dom';

const initialState = {
  loading: true,
  error: null,
  resources: {
    articles: [],
    videos: [],
    books: [],
  },
};

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

function Resources({ session }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const fetchResources = async () => {
      dispatch({ type: 'FETCH_START' });
      try {
        const res = await fetch('https://ugood-3osi.onrender.com/generate-resources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: session?.user?.id }),
        });
        const data = await res.json();
        // Expecting: { articles: [...], videos: [...], books: [...] }
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
