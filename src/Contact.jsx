import {Link} from "react-router-dom";
import './App.css';
import React, { useState } from 'react';
import './Contact.css';


function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState('');

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();//need to include the email sending logic, i will have to use some api
    setStatus('😊 Thank you for reaching out! We will get back to you soon.');
    setFormData({ name: '', email: '', message: '' });
  };

  return (
    <div className="contact-container">
      <h1>Contact UGood 💌</h1>
      <p>
        We’re excited to hear from you! Whether you have a question, feedback, or just want to say hi, drop us a line below.
      </p>
      <form className="contact-form" onSubmit={handleSubmit}>
        <input
          name="name"
          type="text"
          placeholder="Your Name 😊"
          value={formData.name}
          onChange={handleChange}
          required
        />
        <input
          name="email"
          type="email"
          placeholder="Your Email 📧"
          value={formData.email}
          onChange={handleChange}
          required
        />
        <textarea
          name="message"
          placeholder="Your Message 💭"
          value={formData.message}
          onChange={handleChange}
          required
        />
        <button type="submit">Send Message 🚀</button>
      </form>
      {status && <p className="status-message">{status}</p>}
    </div>
  );
}

export default Contact;
