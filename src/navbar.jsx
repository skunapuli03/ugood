import React from "react";
import {Link} from "react-router-dom";
import './Navbar.css';


//testing the link with only one button before launch make sure everything is linked correctly
const Navbar = () => {
    return (
        <nav className="navbar">
            <Link to = '/'><div className = 'logo'>UGood</div></Link>
            <div className = 'links'>
                <Link to ="/features">Features</Link> 
                <Link to="/resources">Resources</Link>
                <Link to="/about">About</Link>
            </div>
            <div className = 'buttons'>
                
                {/*<button>Sign Up</button> will only link this up properly once users r on 
                and auth is setup, try firebase first before jwt*/}
                <Link to ="/entry">
                    <button className = 'primary'>Get Started 📖</button>
                </Link> 
            </div>
        </nav>
    );
}

export default Navbar;
