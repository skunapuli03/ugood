import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import Navbar from './navbar';
import './Journal-Detail.css';

const supabaseUrl = "https://ggksgziwgftlyfngtolu.supabase.co";
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdna3Nneml3Z2Z0bHlmbmd0b2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0NzI2MzYsImV4cCI6MjA1NTA0ODYzNn0.NsHJXXdtWV6PmdqqV_Q8pjmp9CXE23mTXYVRpPzt9M8';
const supabase = createClient(supabaseUrl, supabaseKey);

const JournalDetail = ({ session }) => {
  const { id } = useParams();
  const [journal, setJournal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJournal = async () => {
      try {
        const { data, error } = await supabase
          .from('journals')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setJournal(data);
      } catch (error) {
        console.error('Error fetching journal:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchJournal();
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (!journal) return <div>Journal not found</div>;

  return (
    <>
      <Navbar session={session} />
      <div className="journal-detail-page">
        <div className="journal-detail-header">
            <Link to="/" className="back-button">
                ← Back to Journals
            </Link>
            <div className="journal-date">
                {new Date(journal.created_at).toLocaleDateString()}
            </div>
            </div>

            <div className="journal-detail-content">
            <div className="feeling-indicator">
                Feeling: {journal.feeling}
            </div>
            
            <div className="journal-entry">
                <h2>Journal Entry</h2>
                <p>{journal.content}</p>
            </div>

            {journal.reflection && (
                <div className="journal-reflection">
                <h2> Lesson </h2>
                <p>{journal.reflection}</p>
                </div>
            )}
            </div>
      </div>
    </>
  );
};

export default JournalDetail;