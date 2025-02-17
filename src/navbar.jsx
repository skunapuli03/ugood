import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import './Navbar.css';

const supabaseUrl = "https://ggksgziwgftlyfngtolu.supabase.co";
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdna3Nneml3Z2Z0bHlmbmd0b2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0NzI2MzYsImV4cCI6MjA1NTA0ODYzNn0.NsHJXXdtWV6PmdqqV_Q8pjmp9CXE23mTXYVRpPzt9M8'
const supabase = createClient(supabaseUrl, supabaseKey);

const Navbar = ({ session }) => {
    const navigate = useNavigate();

    const handleSignOut = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            navigate('/auth');
        } catch (error) {
            console.error('Error signing out:', error.message);
        }
    };

    return (
        <nav className="navbar">
            <Link to='/'><div className='logo'>UGood</div></Link>
            <div className='links'>
                <Link to="/features">Features</Link> 
                <Link to="/resources">Resources</Link>
                <Link to="/about">About</Link>
            </div>
            <div className='auth-buttons'>
                {session ? (
                    <div className="user-controls">
                        <span className="user-email">{session.user.email}</span>
                        <button 
                            onClick={handleSignOut} 
                            className="sign-out"
                        >
                            Sign Out
                        </button>
                    </div>
                ) : (
                    <Link to="/auth">
                        <button className='primary'>Get Started 📖</button>
                    </Link>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
