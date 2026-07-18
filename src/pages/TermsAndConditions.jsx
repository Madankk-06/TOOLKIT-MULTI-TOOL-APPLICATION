/**
 * FILE: src/pages/TermsAndConditions.jsx
 *
 * Mandatory Terms & Conditions acceptance page shown after video completion / register.
 * Prevents user from entering the app until terms are read & accepted.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { isTermsAccepted, markTermsAccepted } from '../lib/termsHelper';

const TERMS_SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: 'By creating an account and using ToolKit AI ("the App"), you agree to be bound by these Terms and Conditions. If you do not agree, please do not use the App. These terms govern your access to and use of all tools, features, and AI-powered capabilities provided by ToolKit AI.'
  },
  {
    title: '2. User Accounts & Security',
    body: 'You are responsible for maintaining the confidentiality of your account credentials. All activities under your account are your responsibility. ToolKit AI reserves the right to suspend or terminate accounts that violate community safety or attempt to exploit the platform.'
  },
  {
    title: '3. SmartSearch & AI Processing',
    body: 'ToolKit AI uses advanced natural language processing to route your queries to appropriate tools. Your search queries may be temporarily processed to improve AI accuracy. No personal identification data is sold or shared with third-party advertisers.'
  },
  {
    title: '4. Privacy & Data Handling',
    body: 'We value your privacy. Local data (like calculated history, preferences, and temporary tool inputs) is stored securely on your device. Cloud data is encrypted in transit and at rest using standard Firebase Security Protocols.'
  },
  {
    title: '5. Health & Wellness Disclaimer',
    body: 'All health-related tools (BMI, Vision Studio, Breath Control, Nutrition, Periods Tracker) are provided for general informational and educational purposes ONLY. They do NOT constitute medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional.'
  },
  {
    title: '6. Tool-Specific Terms',
    body: 'Certain tools utilize device sensors (camera, microphone, accelerometer, magnetometer, flashlight). By using these tools, you grant temporary permission to access these hardware features. Sensor data is processed locally and never transmitted externally.'
  },
  {
    title: '7. Intellectual Property',
    body: 'The ToolKit AI interface, design system, custom shaders, and branding are protected by copyright and intellectual property laws. You may not reverse-engineer, mirror, or redistribute the platform without explicit authorization.'
  },
  {
    title: '8. Prohibited Conduct',
    body: 'You agree not to: (a) automated scraping or DDoS attacks against ToolKit AI services; (b) attempt to bypass authentication or access control measures; (c) upload malicious payloads or exploit security vulnerabilities.'
  },
  {
    title: '9. Limitation of Liability',
    body: 'ToolKit AI is provided "AS IS" without warranties of any kind. Under no circumstances shall ToolKit AI or its developers be liable for any indirect, incidental, or consequential damages resulting from your use of the platform.'
  },
  {
    title: '10. Changes to Terms',
    body: 'We reserve the right to modify these Terms and Conditions at any time. Significant changes will be communicated via in-app notification. Continued use of the App after changes constitutes your acceptance of the revised terms.'
  }
];

export default function TermsAndConditions() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [accepted, setAccepted] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef(null);

  const canProceed = accepted && scrolledToBottom;

  useEffect(() => {
    // If already accepted, go home
    if (currentUser && isTermsAccepted(currentUser.uid)) {
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 40;
    if (atBottom) setScrolledToBottom(true);
  };

  const handleAccept = () => {
    if (!canProceed || isProcessing) return;
    setIsProcessing(true);
    if (currentUser) {
      markTermsAccepted(currentUser.uid);
    }
    setTimeout(() => navigate('/', { replace: true }), 600);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #080f18 0%, #0d1a2e 50%, #060c14 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', fontFamily: "'Inter', 'Segoe UI', sans-serif",
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background particles */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }} aria-hidden="true">
        {[...Array(12)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: `${[2,3,4,2,3][i % 5]}px`,
            height: `${[2,3,4,2,3][i % 5]}px`,
            borderRadius: '50%',
            background: ['#e91e8c','#00d4ff','#c9a96e','#00ff88','#ff6b35'][i % 5],
            top: `${[8,18,32,48,62,74,85,12,28,55,70,90][i]}%`,
            left: `${[5,15,25,40,55,65,80,90,10,35,75,50][i]}%`,
            opacity: 0.4,
            animation: `float ${5 + i % 4}s ease-in-out ${i * 0.3}s infinite alternate`,
            boxShadow: `0 0 ${8 + i % 4}px currentColor`,
          }} />
        ))}
      </div>

      <style>{`
        @keyframes float { from { transform: translateY(0px); } to { transform: translateY(-12px); } }
        .tc-scroll::-webkit-scrollbar { width: 6px; }
        .tc-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.04); border-radius: 3px; }
        .tc-scroll::-webkit-scrollbar-thumb { background: rgba(233,30,140,0.4); border-radius: 3px; }
        .tc-check-row:hover { background: rgba(233,30,140,0.08) !important; }
      `}</style>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          width: '100%', maxWidth: '760px',
          background: 'rgba(15,20,35,0.85)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(233,30,140,0.2)',
          borderRadius: '24px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
          overflow: 'hidden',
          position: 'relative', zIndex: 1,
        }}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(233,30,140,0.15) 0%, rgba(201,169,110,0.08) 100%)',
          borderBottom: '1px solid rgba(233,30,140,0.2)',
          padding: '28px 36px',
          display: 'flex', alignItems: 'center', gap: '16px',
        }}>
          <img src="/logo.png" alt="ToolKit" style={{ width: 44, height: 44, objectFit: 'contain' }} onError={e => e.target.style.display = 'none'} />
          <div>
            <h1 style={{
              margin: 0, fontSize: '22px', fontWeight: '800',
              background: 'linear-gradient(135deg, #e91e8c, #c9a96e)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              fontFamily: "'Orbitron', sans-serif", letterSpacing: '1px',
            }}>
              ToolKit AI
            </h1>
            <p style={{ margin: '4px 0 0', color: '#888', fontSize: '13px' }}>
              Terms & Conditions — Please read carefully before continuing
            </p>
          </div>
          <div style={{
            marginLeft: 'auto',
            background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.25)',
            borderRadius: '20px', padding: '4px 14px',
            fontSize: '11px', fontWeight: '700', color: '#00d4ff', letterSpacing: '0.5px',
          }}>
            LEGAL AGREEMENT
          </div>
        </div>

        {/* Scrollable T&C Content */}
        <div style={{ padding: '0 36px' }}>
          <p style={{
            color: '#888', fontSize: '13px', margin: '16px 0 12px',
            padding: '10px 14px',
            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: '10px',
          }}>
            📋 Please scroll through all terms before accepting.
            {!scrolledToBottom && <span style={{ color: '#F59E0B', marginLeft: 6 }}>Scroll to the bottom to enable the checkbox.</span>}
          </p>

          <div
            ref={scrollRef}
            className="tc-scroll"
            onScroll={handleScroll}
            style={{
              maxHeight: '340px', overflowY: 'auto',
              paddingRight: '8px', paddingBottom: '8px',
            }}
          >
            {TERMS_SECTIONS.map((section, i) => (
              <div key={i} style={{ marginBottom: '20px' }}>
                <h3 style={{
                  color: '#c9a96e', fontSize: '13px', fontWeight: '700',
                  fontFamily: "'Orbitron', sans-serif", letterSpacing: '0.5px',
                  margin: '0 0 8px',
                }}>
                  {section.title}
                </h3>
                <p style={{
                  color: '#b0b8cc', fontSize: '13px', lineHeight: '1.7',
                  margin: 0,
                }}>
                  {section.body}
                </p>
              </div>
            ))}

            <div style={{
              margin: '24px 0 8px',
              padding: '16px',
              background: 'rgba(233,30,140,0.06)',
              border: '1px solid rgba(233,30,140,0.2)',
              borderRadius: '12px',
            }}>
              <p style={{ color: '#e91e8c', fontSize: '12px', fontWeight: '600', margin: 0 }}>
                Last updated: June 2026 · Effective immediately upon account creation.
              </p>
            </div>
          </div>
        </div>

        {/* Single Checkbox */}
        <div style={{ padding: '20px 36px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div
            className="tc-check-row"
            onClick={() => scrolledToBottom && setAccepted(prev => !prev)}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: '14px',
              padding: '14px 16px', borderRadius: '12px',
              cursor: scrolledToBottom ? 'pointer' : 'not-allowed',
              opacity: scrolledToBottom ? 1 : 0.4,
              transition: 'all 0.2s ease',
              background: accepted ? 'rgba(233,30,140,0.08)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${accepted ? 'rgba(233,30,140,0.35)' : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            <div style={{
              width: '22px', height: '22px',
              border: `2px solid ${accepted ? '#e91e8c' : 'rgba(255,255,255,0.25)'}`,
              borderRadius: '6px',
              background: accepted ? 'rgba(233,30,140,0.25)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, marginTop: '1px',
              transition: 'all 0.2s ease',
              boxShadow: accepted ? '0 0 12px rgba(233,30,140,0.4)' : 'none',
            }}>
              <AnimatePresence>
                {accepted && (
                  <motion.svg
                    initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                    width="14" height="14" viewBox="0 0 12 12" fill="none"
                  >
                    <path d="M2 6L5 9L10 3" stroke="#e91e8c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </motion.svg>
                )}
              </AnimatePresence>
            </div>
            <span style={{ color: '#e2e8f0', fontSize: '13px', lineHeight: '1.6', flex: 1, fontWeight: 500 }}>
              I have read and agree to all the Terms & Conditions, Privacy Policy, Health Disclaimer, and Age Requirements (13+) of ToolKit AI.
            </span>
          </div>
        </div>

        {/* Footer / Accept button */}
        <div style={{
          padding: '20px 36px 28px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '16px', flexWrap: 'wrap',
        }}>
          <div style={{ fontSize: '12px', color: '#888' }}>
            {!scrolledToBottom
              ? '⬇ Scroll to read all terms'
              : !accepted
              ? '1 agreement required to proceed'
              : '✓ Terms accepted — ready to proceed'
            }
          </div>

          <motion.button
            whileHover={canProceed ? { scale: 1.04 } : {}}
            whileTap={canProceed ? { scale: 0.97 } : {}}
            onClick={handleAccept}
            disabled={!canProceed || isProcessing}
            style={{
              padding: '12px 32px',
              background: canProceed
                ? 'linear-gradient(135deg, #e91e8c 0%, #c9a96e 100%)'
                : 'rgba(255,255,255,0.08)',
              border: 'none',
              borderRadius: '24px',
              color: canProceed ? '#fff' : '#444',
              fontWeight: '700',
              fontSize: '14px',
              fontFamily: "'Orbitron', sans-serif",
              letterSpacing: '0.5px',
              cursor: canProceed ? 'pointer' : 'not-allowed',
              opacity: canProceed ? 1 : 0.5,
              boxShadow: canProceed ? '0 8px 24px rgba(233,30,140,0.35)' : 'none',
              transition: 'all 0.3s ease',
            }}
          >
            {isProcessing ? 'Processing…' : 'Accept & Continue →'}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
