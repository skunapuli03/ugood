import React from 'react';
import { Link } from 'react-router-dom';

function Resources() {
  return (
    <div className="resources-page">
      <p3>this page will be a hub for all kinds of resources for getting help and climbing the mountain of challenges!!!</p3>
      <br />
      <p4>  this page will be updated very soon😊👌</p4>
      <br />
      <Link to ="/entry">
        <button className='try-ugood'>
          Try UGood Free
        </button>
      </Link> 
    </div>
  );
}

export default Resources;
