import React from 'react';
import { Link } from 'react-router-dom';
import './features.css';

function Features() {
  return (
    <div className="features-page">
      <p3>btw we r still working on some features but stay tuned they will be released soon 😊👌</p3>
      <br />
      <p4>  this page will be updated very soon! so stay tuned!!!</p4>
      <br />
      <Link to ="/entry">
        <button className='try-ugood'>
          Try UGood Free
        </button>
      </Link> 
    </div>
  );
}

export default Features;
