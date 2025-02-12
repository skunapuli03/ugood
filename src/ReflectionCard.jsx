import React from 'react';
import './ReflectionCard.css';

const ReflectionCard = ({ reflection }) => {
  return (
    <div className="reflection-card">
      <h3>Lesson</h3>
      <p>{reflection}</p>
    </div>
  );
};

export default ReflectionCard;