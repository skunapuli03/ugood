import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import './ChatInterface.css';

function ChatInterface({ journal, onClose, session }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:9999/generate-reflections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          journalEntry: journal.content,
          userMessage: inputMessage,
          type: 'what-if'
        }),
      });

      const data = await response.json();
      
      const aiMessage = {
        type: 'ai',
        content: data.reflection,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);

      // Only save if user is logged in
      if (session) {
        await supabase
          .from('chat_messages')
          .insert([
            {
              journal_id: journal.id,
              user_id: session.user.id,
              content: inputMessage,
              type: 'user'
            },
            {
              journal_id: journal.id,
              user_id: session.user.id,
              content: data.reflection,
              type: 'ai'
            }
          ]);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="chat-interface"
    >
      <div className="chat-header">
        <h3>What If Reflection 💭</h3>
        <button onClick={onClose}>×</button>
      </div>

      <div className="chat-messages">
        {messages.map((msg, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`message ${msg.type}`}
          >
            <p>{msg.content}</p>
            <small>{new Date(msg.timestamp).toLocaleTimeString()}</small>
          </motion.div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <textarea
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Ask a what-if question..."
          onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
        />
        <button 
          onClick={handleSendMessage}
          disabled={loading}
        >
          {loading ? '...' : 'Send'}
        </button>
      </div>
    </motion.div>
  );
}

export default ChatInterface;