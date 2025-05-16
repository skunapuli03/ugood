import React, { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "./navbar";
import { motion, AnimatePresence } from "framer-motion";
import "./App.css";
import "./entry.css";

const DEMO_LESSON_API = "https://ugood-3osi.onrender.com/generate-reflections";

const About = () => {
  const [demoText, setDemoText] = useState("");
  const [demoLesson, setDemoLesson] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleDemo = async () => {
    if (!demoText.trim()) return;
    setLoading(true);
    setDemoLesson("");
    try {
      const res = await fetch(DEMO_LESSON_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ journalEntry: demoText }),
      });
      const data = await res.json();
      setDemoLesson(data?.reflection || "No lesson generated.");
    } catch {
      setDemoLesson("Could not generate lesson. Try again!");
    }
    setLoading(false);
  };

  const handleDemoSave = () => {
    setShowModal(true);
  };

  return (
    <>
      <Navbar />
      <div className="about-page">
        {/* HERO SECTION */}
        <section className="about-hero">
          <motion.h1
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            Welcome to <span className="ugood-gradient">UGood</span>
          </motion.h1>
          <motion.p
            className="about-mission"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
          >
            <strong>AI-powered journaling for real growth.</strong>  
            <br />
            Reflect, learn, and transform your life—one entry at a time.
          </motion.p>
          <motion.div
            className="about-hero-cards"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7 }}
          >
            <div className="about-hero-card">
              <span role="img" aria-label="growth" className="about-hero-emoji">🌱</span>
              <h3>Personal Growth</h3>
              <p>Turn your thoughts into actionable insights with instant AI feedback.</p>
            </div>
            <div className="about-hero-card">
              <span role="img" aria-label="privacy" className="about-hero-emoji">🔒</span>
              <h3>Private & Secure</h3>
              <p>Your entries are yours—always. We never share your data.</p>
            </div>
            <div className="about-hero-card">
              <span role="img" aria-label="community" className="about-hero-emoji">🤝</span>
              <h3>Supportive Community</h3>
              <p>Join others on a journey of self-improvement and reflection.</p>
            </div>
          </motion.div>
        </section>

        {/* DEMO SECTION */}
        <section className="about-demo">
          <h2>✨ Try UGood’s AI Journal Demo</h2>
          <p>
            Experience the magic of AI-powered reflection.  
            Write a journal entry below and get a real AI-generated lesson—no account needed!
          </p>
          <div className="about-demo-entry">
            <textarea
              className="journal-input"
              placeholder="Try writing about your day, a challenge, or a goal..."
              value={demoText}
              onChange={e => setDemoText(e.target.value)}
              rows={5}
              maxLength={600}
            />
            <div className="about-demo-buttons">
              <motion.button
                className="save-entry-btn"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleDemoSave}
                disabled={loading || !demoText.trim()}
              >
                Save Entry
              </motion.button>
              <motion.button
                className="primary"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleDemo}
                disabled={loading || !demoText.trim()}
              >
                {loading ? "Generating Lesson..." : "Get Lesson"}
              </motion.button>
            </div>
            <AnimatePresence>
              {demoLesson && (
                <motion.div
                  className="about-demo-lesson"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.3 }}
                >
                  <h4>✨ Your AI Lesson</h4>
                  <div>{demoLesson}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="about-demo-note">
            <span>Saving is only available for registered users.</span>
          </div>
        </section>

        {/* CTA SECTION */}
        <section className="about-cta">
          <h2>Ready for the full experience?</h2>
          <p>
            Create your free account to save entries, track your growth, and unlock all features.
          </p>
          <Link to="/auth">
            <motion.button
              className="primary"
              whileHover={{ scale: 1.07 }}
              whileTap={{ scale: 0.97 }}
            >
              Create Your Free Account
            </motion.button>
          </Link>
        </section>
      </div>

      {/* Modal for Save Entry */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
            >
              <h3>Sign Up Required</h3>
              <p>You must create an account to save your journals and track your growth.</p>
              <Link to="/auth">
                <button className="primary">Sign Up</button>
              </Link>
              <button className="close-button" onClick={() => setShowModal(false)}>Close</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default About;
