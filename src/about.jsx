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
      <div className="about-split">
        {/* LEFT: Mission, Slogan, Values */}
        <section className="about-left">
          <motion.h1
            className="about-slogan"
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            Reflect Better.<br />Grow Quicker.
          </motion.h1>
          <motion.p
            className="about-mission"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
          >
            <strong>Our Mission:</strong> Empower everyone to unlock their best self through guided reflection, instant insights, and a supportive digital space.
          </motion.p>
          <ul className="about-values-list">
            <li>✨ <strong>Personal Growth:</strong> Turn thoughts into lessons with AI-powered feedback.</li>
            <li>🔒 <strong>Privacy First:</strong> Your entries are yours.</li>
            <li>🤖 <strong>AI Enhancement:</strong> With AI you Grow quicker, learn better.</li>
          </ul>
          <div className="about-cta">
            <h3>Ready for the full experience?</h3>
            <Link to="/auth">
              <motion.button
                className="primary"
                whileHover={{ scale: 1.07 }}
                whileTap={{ scale: 0.97 }}
              >
                Create Your Free Account
              </motion.button>
            </Link>
          </div>
        </section>

        {/* RIGHT: Interactive Demo */}
        <section className="about-right">
          <div className="about-demo">
            <h2>Try the UGood Demo</h2>
            <p>
              Write a journal entry and see your instant AI-generated lesson.<br />
              <span className="about-demo-note">Saving is only for registered users.</span>
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
          </div>
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
