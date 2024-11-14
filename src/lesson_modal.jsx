// lesson showing up in the modal window
import React from 'react';
import './Modal.css'; 

const LessonModal = ({ message, onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>X</button>
        <h3>Reflection/Insight</h3>
        <p>{message}</p>
      </div>
    </div>
  );
};

export default LessonModal;
