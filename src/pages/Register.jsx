import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import CosmicCanvas from '../components/CosmicCanvas';
import { auth, db } from '../firebase/config';
import { fetchSignInMethodsForEmail } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { generateOTP, sendOTPEmail } from '../services/otpService';
import gsap from 'gsap';
import './Register.css';

// ── EXACT SAME VIDEO BACKGROUND AS LOGIN ─────────────────────────────────────
function AmbientBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', backgroundColor: '#0c0c0c', pointerEvents: 'none', width: '100vw', height: '100vh' }}>
      <video
        autoPlay
        loop
        muted
        playsInline
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          minWidth: '100%',
          minHeight: '100%',
          width: 'auto',
          height: 'auto',
          transform: 'translate(-50%, -50%)',
          objectFit: 'cover'
        }}
      >
        <source
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260514_135830_bb6491d1-9b66-4aec-9722-13b4dfe3fb46.mp4"
          type="video/mp4"
        />
      </video>
    </div>
  );
}

const EyeIcon = ({ open }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {open ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    )}
  </svg>
);

// LogoIcon SVG was replaced in favor of premium image asset

function getFirebaseErrorMessage(code) {
  switch (code) {
    case 'auth/email-already-in-use': return 'This email is already registered. Try logging in.';
    case 'auth/invalid-email': return 'The email address is badly formatted.';
    case 'auth/weak-password': return 'Password should be at least 6 characters.';
    case 'auth/operation-not-allowed': return 'Email/password accounts are not enabled.';
    case 'auth/network-request-failed': return 'Network error. Please check your connection.';
    case 'auth/too-many-requests': return 'Too many requests. Please try again later.';
    case 'auth/internal-error': return 'Firebase internal error. Please try again later.';
    case 'auth/invalid-credential': return 'Invalid credentials provided.';
    default:
      if (code?.includes('auth/')) return `Auth Error: ${code.split('/')[1].replace(/-/g, ' ')}`;
      return code || 'An unexpected error occurred. Please try again.';
  }
}

export default function Register() {
  const [isInsideForm, setIsInsideForm] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [step, setStep] = useState(1); // 1: Details, 2: OTP
  const [otp, setOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const [playVideo, setPlayVideo] = useState(false);
  const [sentOtp, setSentOtp] = useState('');
  const [otpSentTime, setOtpSentTime] = useState(0);

  // Sound effects state and references
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const lockRef = useRef(null);
  const tlRef = useRef(null);
  const audioCtxRef = useRef(null);

  // Helper to initialize and retrieve Web Audio context safely
  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  // Synthetic sound design engine using Web Audio API
  const sfxEngine = {
    ears() {
      if (!soundEnabledRef.current) return;
      try {
        const ctx = getAudioContext();
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.15);
      } catch (e) {
        console.warn("Audio play failed:", e);
      }
    },
    wire() {
      if (!soundEnabledRef.current) return;
      try {
        const ctx = getAudioContext();
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.linearRampToValueAtTime(600, t + 0.3);
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.3);
      } catch (e) {
        console.warn("Audio play failed:", e);
      }
    },
    rattle() {
      if (!soundEnabledRef.current) return;
      try {
        const ctx = getAudioContext();
        const t = ctx.currentTime;
        for (let i = 0; i < 5; i++) {
          const burstTime = t + i * 0.05;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(100 + Math.random() * 100, burstTime);
          gain.gain.setValueAtTime(0.05, burstTime);
          gain.gain.exponentialRampToValueAtTime(0.001, burstTime + 0.04);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(burstTime);
          osc.stop(burstTime + 0.04);
        }
      } catch (e) {
        console.warn("Audio play failed:", e);
      }
    },
    flick() {
      if (!soundEnabledRef.current) return;
      try {
        const ctx = getAudioContext();
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, t);
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.25);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.25);
      } catch (e) {
        console.warn("Audio play failed:", e);
      }
    },
    drop() {
      if (!soundEnabledRef.current) return;
      try {
        const ctx = getAudioContext();
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(90, t);
        osc.frequency.exponentialRampToValueAtTime(30, t + 0.2);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.25);

        const oscClick = ctx.createOscillator();
        const gainClick = ctx.createGain();
        oscClick.type = 'sine';
        oscClick.frequency.setValueAtTime(1000, t + 0.04);
        gainClick.gain.setValueAtTime(0.1, t + 0.04);
        gainClick.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        oscClick.connect(gainClick);
        gainClick.connect(ctx.destination);
        oscClick.start(t + 0.04);
        oscClick.stop(t + 0.08);
      } catch (e) {
        console.warn("Audio play failed:", e);
      }
    },
    unlock() {
      if (!soundEnabledRef.current) return;
      try {
        const ctx = getAudioContext();
        const t = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(800, t);
        gain1.gain.setValueAtTime(0.08, t);
        gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(t);
        osc1.stop(t + 0.05);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(700, t + 0.06);
        gain2.gain.setValueAtTime(0.08, t + 0.06);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(t + 0.06);
        osc2.stop(t + 0.11);
      } catch (e) {
        console.warn("Audio play failed:", e);
      }
    },
    slide() {
      if (!soundEnabledRef.current) return;
      try {
        const ctx = getAudioContext();
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.linearRampToValueAtTime(100, t + 0.3);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.linearRampToValueAtTime(0.01, t + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.3);
      } catch (e) {
        console.warn("Audio play failed:", e);
      }
    },
    click() {
      if (!soundEnabledRef.current) return;
      try {
        const ctx = getAudioContext();
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(950, t);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.06);
      } catch (e) {
        console.warn("Audio play failed:", e);
      }
    },
    iris() {
      if (!soundEnabledRef.current) return;
      try {
        const ctx = getAudioContext();
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(150, t + 0.45);
        gain.gain.setValueAtTime(0.06, t);
        gain.gain.linearRampToValueAtTime(0.01, t + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.45);
      } catch (e) {
        console.warn("Audio play failed:", e);
      }
    },
    spin() {
      if (!soundEnabledRef.current) return;
      try {
        const ctx = getAudioContext();
        const t = ctx.currentTime;
        for (let i = 0; i < 8; i++) {
          const clickTime = t + i * 0.07;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(600 - i * 40, clickTime);
          gain.gain.setValueAtTime(0.06, clickTime);
          gain.gain.exponentialRampToValueAtTime(0.001, clickTime + 0.03);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(clickTime);
          osc.stop(clickTime + 0.03);
        }
      } catch (e) {
        console.warn("Audio play failed:", e);
      }
    },
    bolt() {
      if (!soundEnabledRef.current) return;
      try {
        const ctx = getAudioContext();
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(80, t);
        osc.frequency.exponentialRampToValueAtTime(25, t + 0.3);
        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.3);
      } catch (e) {
        console.warn("Audio play failed:", e);
      }
    },
    power() {
      if (!soundEnabledRef.current) return;
      try {
        const ctx = getAudioContext();
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(90, t);
        osc.frequency.exponentialRampToValueAtTime(260, t + 0.5);
        gain.gain.setValueAtTime(0.07, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.55);
      } catch (e) {
        console.warn("Audio play failed:", e);
      }
    },
    alarm() {
      if (!soundEnabledRef.current) return;
      try {
        const ctx = getAudioContext();
        const t = ctx.currentTime;
        for (let i = 0; i < 2; i++) {
          const beepTime = t + i * 0.18;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, beepTime);
          gain.gain.setValueAtTime(0.08, beepTime);
          gain.gain.exponentialRampToValueAtTime(0.001, beepTime + 0.12);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(beepTime);
          osc.stop(beepTime + 0.12);
        }
      } catch (e) {
        console.warn("Audio play failed:", e);
      }
    }
  };

  const sfxRevEngine = {
    ears: sfxEngine.ears,
    wire: sfxEngine.wire,
    rattle: sfxEngine.rattle,
    flick: sfxEngine.flick,
    drop: sfxEngine.unlock,
    unlock: sfxEngine.drop,
    slide: sfxEngine.slide,
    click: sfxEngine.click,
    iris: sfxEngine.iris,
    spin: sfxEngine.spin,
    bolt: sfxEngine.bolt,
    power: sfxEngine.power,
    alarm: sfxEngine.alarm
  };

  const directionRef = useRef(1);
  const BOLT_THROW = 60;
  const VBOLT_THROW = 26;

  // Password entropy estimator
  const estimateEntropy = (pwVal) => {
    if (!pwVal) return 0;
    let pool = 0;
    if (/[a-z]/.test(pwVal)) pool += 26;
    if (/[A-Z]/.test(pwVal)) pool += 26;
    if (/[0-9]/.test(pwVal)) pool += 10;
    if (/[^a-zA-Z0-9]/.test(pwVal)) pool += 32;
    return Math.round(pwVal.length * Math.log2(pool || 1));
  };

  // Setup initial GSAP state and timeline on step 1 mount
  useEffect(() => {
    if (step !== 1 || !lockRef.current) return;
    const container = lockRef.current;
    
    const $ = (s) => container.querySelector(s);
    const $$ = (s) => [...container.querySelectorAll(s)];

    const door     = $('#door');
    const ears     = $$('.ear');
    const clip     = $('.clip');
    const clipWob  = $('.clip__wob');
    const wire     = $('.clip__wire');
    const pad      = $('.pad');
    const padSway  = $('.pad__sway');
    const shackle  = $('.pad__shackle');
    const padBody  = $('.pad__body');
    const house    = $('.bolt__house');
    const strike   = $('.bolt__strike');
    const slug     = $('.bolt__slug');
    const turn     = $('.bolt__turn');
    const knob     = $('.bolt__knob');
    const rivets   = $$('.bolt__rivet');
    const vault    = $('.vault');
    const vbolts   = $$('.vbolt');
    const wheel    = $('.wheel');
    const lamp     = $('.vault__lamp');
    const shock    = $('.shock');
    const WIRE_LEN = wire ? (typeof wire.getTotalLength === 'function' ? wire.getTotalLength() : 300) : 300;

    // Set origin coordinates
    gsap.set(pad,     { svgOrigin: '280 214' });
    gsap.set(padSway, { svgOrigin: '280 214' });
    gsap.set(shackle, { svgOrigin: '253 300' });
    gsap.set(knob,    { svgOrigin: '200 273' });
    gsap.set(wheel,   { svgOrigin: '280 280' });
    gsap.set(vault,   { svgOrigin: '280 280' });
    gsap.set(shock,   { svgOrigin: '280 280' });
    gsap.set(ears,    { transformOrigin: '50% 100%' });

    gsap.set(door,    { x: 0, y: 0 });
    gsap.set(ears,    { scale: 0, y: -12, opacity: 0 });
    gsap.set(clip,    { x: -140, y: -40, rotation: -110, scale: 0.7, opacity: 0 });
    gsap.set(clipWob, { rotation: 0 });
    gsap.set(wire,    { strokeDasharray: WIRE_LEN, strokeDashoffset: WIRE_LEN });
    gsap.set(pad,     { y: -280, x: 0, rotation: -10, opacity: 0 });
    gsap.set(padSway, { rotation: 0 });
    gsap.set(shackle, { y: -34, rotation: -15 });
    gsap.set(padBody, { scaleX: 1, scaleY: 1 });
    gsap.set(house,   { x: -220, opacity: 0 });
    gsap.set(strike,  { x: 220, opacity: 0 });
    gsap.set(turn,    { x: -220, opacity: 0 });
    gsap.set(knob,    { rotation: 0 });
    gsap.set(slug,    { x: 0 });
    gsap.set(rivets,  { scale: 0, transformOrigin: '50% 50%' });
    gsap.set(vault,   { scale: 0.06, rotation: -55, opacity: 0 });
    gsap.set(vbolts,  { x: 0 });
    gsap.set(wheel,   { rotation: 0 });
    gsap.set(lamp,    { opacity: 0 });
    gsap.set(shock,   { scale: 1, opacity: 0 });

    const cue = (name) => {
      return () => {
        const playForward = directionRef.current > 0;
        if (playForward) {
          sfxEngine[name]?.();
        } else {
          sfxRevEngine[name]?.();
        }
      };
    };

    // Construct the global timeline
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });
    tlRef.current = tl;

    // --- TIER 1: Paperclip ---
    tl.addLabel('t0', 0)
      .add(cue('ears'), 0.04)
      .to(ears, { scale: 1, y: 0, opacity: 1, duration: 0.38, stagger: 0.08, ease: 'back.out(2.6)' }, 0.04)
      .add(cue('wire'), 0.34)
      .to(clip, { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1, duration: 0.52, ease: 'back.out(1.7)' }, 0.34)
      .to(wire, { strokeDashoffset: 0, duration: 0.5, ease: 'power2.inOut' }, 0.36)
      .add(cue('rattle'), 0.92)
      .to(door, { keyframes: { x: [0, -1.5, 1.5, -1, 1, 0] }, duration: 0.34, ease: 'none' }, 0.92)
      .addLabel('t1', 1.08)

    // --- TIER 2: Padlock ---
      .add(cue('flick'), 1.10)
      .to(clip, { x: 150, y: -200, rotation: 400, opacity: 0, duration: 0.42, ease: 'power2.in' }, 1.10)
      .to(pad, { y: 0, rotation: 0, opacity: 1, duration: 0.48, ease: 'power2.in' }, 1.26)
      .add(cue('drop'), 1.74)
      .to(padBody, { scaleY: 0.9, scaleX: 1.08, duration: 0.08, ease: 'power1.in' }, 1.74)
      .to(padBody, { scaleY: 1, scaleX: 1, duration: 0.24, ease: 'back.out(3)' }, 1.82)
      .to(shackle, { y: 0, rotation: 0, duration: 0.12, ease: 'power1.inOut' }, 1.78)
      .to(door, { keyframes: { x: [0, -1, 1, -0.5, 0.5, 0] }, duration: 0.2, ease: 'none' }, 1.76)
      .addLabel('t2', 2.06)

    // --- TIER 3: Deadbolt ---
      .add(cue('unlock'), 2.08)
      .to(shackle, { y: -34, rotation: -15, duration: 0.12, ease: 'power1.inOut' }, 2.08)
      .to(pad, { y: 280, rotation: 25, opacity: 0, duration: 0.48, ease: 'power2.in' }, 2.20)
      .to(ears, { scale: 0, y: -12, opacity: 0, duration: 0.25, stagger: 0.04 }, 2.30)
      .add(cue('slide'), 2.40)
      .to(house, { x: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }, 2.40)
      .to(strike, { x: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }, 2.40)
      .to(turn, { x: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }, 2.45)
      .to(rivets, { scale: 1, duration: 0.4, stagger: 0.05, ease: 'back.out(2)' }, 2.45)
      .add(cue('click'), 2.90)
      .to(knob, { rotation: 90, duration: 0.3, ease: 'power1.inOut' }, 2.90)
      .to(slug, { x: BOLT_THROW, duration: 0.3, ease: 'power2.inOut' }, 3.00)
      .to(door, { keyframes: { x: [0, -0.8, 0.8, -0.4, 0.4, 0] }, duration: 0.15, ease: 'none' }, 3.05)
      .addLabel('t3', 3.30)

    // --- TIER 4: Bank Vault ---
      .to(slug, { x: 0, duration: 0.25, ease: 'power2.inOut' }, 3.32)
      .to(knob, { rotation: 0, duration: 0.25, ease: 'power1.inOut' }, 3.45)
      .to(house, { x: -220, opacity: 0, duration: 0.4, ease: 'power2.in' }, 3.55)
      .to(strike, { x: 220, opacity: 0, duration: 0.4, ease: 'power2.in' }, 3.55)
      .to(turn, { x: -220, opacity: 0, duration: 0.4, ease: 'power2.in' }, 3.55)
      .to(rivets, { scale: 0, duration: 0.3, ease: 'power2.in' }, 3.55)
      .add(cue('iris'), 3.75)
      .to(vault, { scale: 1, rotation: 0, opacity: 1, duration: 0.7, ease: 'back.out(1.5)' }, 3.75)
      .add(cue('spin'), 4.45)
      .to(wheel, { rotation: -360, duration: 0.6, ease: 'power2.inOut' }, 4.45)
      .add(cue('bolt'), 4.85)
      .to(vbolts, { x: VBOLT_THROW, duration: 0.35, ease: 'power3.out' }, 4.85)
      .add(cue('power'), 5.00)
      .to(lamp, { opacity: 1, duration: 0.2 }, 5.00)
      .to(shock, { scale: 2.2, opacity: 0, duration: 0.45, ease: 'power2.out' }, 5.05)
      .to(door, { keyframes: { x: [0, -2, 2, -1, 1, 0] }, duration: 0.35, ease: 'none' }, 5.05)
      .addLabel('t4', 5.40);

  }, [step]);

  // Update playhead on password change
  useEffect(() => {
    if (step !== 1 || !tlRef.current || !lockRef.current) return;
    const tl = tlRef.current;

    const entropy = estimateEntropy(password);

    let tier = 0;
    let name = "No lock at all";
    let desc = "The door is standing open.";

    if (password.length > 0) {
      if (entropy < 28) {
        tier = 1;
        name = "A bent paperclip";
        desc = "Can be opened with a stiff breeze.";
      } else if (entropy < 36) {
        tier = 2;
        name = "A budget padlock";
        desc = "Unlocks in under 5 seconds.";
      } else if (entropy < 50) {
        tier = 3;
        name = "A commercial deadbolt";
        desc = "Will keep honest people out.";
      } else {
        tier = 4;
        name = "A bank vault door";
        desc = "Sealed. Impenetrable.";
      }
    }

    // Update labels in DOM
    const bitsVal = document.getElementById('bits');
    if (bitsVal) bitsVal.textContent = String(entropy);

    const locknameVal = document.getElementById('lockname');
    if (locknameVal) locknameVal.textContent = name;

    const crackVal = document.getElementById('crack');
    if (crackVal) crackVal.textContent = desc;

    // Update meter segments styling
    const meterSegments = lockRef.current.querySelectorAll('.seg');
    meterSegments.forEach((seg, i) => {
      if (i < tier) {
        seg.classList.add('on');
      } else {
        seg.classList.remove('on');
      }
    });

    // Update CSS variables
    const tierColors = ['--t0', '--t1', '--t2', '--t3', '--t4'];
    const tierInkColors = ['--t0-ink', '--t1-ink', '--t2-ink', '--t3-ink', '--t4-ink'];
    lockRef.current.style.setProperty('--lock', `var(${tierColors[tier]})`);
    lockRef.current.style.setProperty('--lock-ink', `var(${tierInkColors[tier]})`);

    // Tween timeline position
    const targetLabel = `t${tier}`;
    const targetTime = tl.labels[targetLabel];
    const currentTime = tl.time();

    directionRef.current = targetTime >= currentTime ? 1 : -1;

    gsap.to(tl, {
      time: targetTime,
      duration: 0.85,
      ease: 'power2.out',
      overwrite: 'auto'
    });

  }, [password, step]);

  // Handle Resend Timer
  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!displayName.trim() || !email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      // 1. Check if user already exists
      let userExists = false;

      // Method A: Built-in Auth Check (May be restricted by Email Enumeration Protection)
      try {
        const methods = await fetchSignInMethodsForEmail(auth, email.trim());
        if (methods && methods.length > 0) userExists = true;
      } catch (authErr) {
        console.warn("Auth existence check restricted:", authErr.code);
      }

      // Method B: Firestore Check (Requires read permission on users collection)
      if (!userExists) {
        try {
          const q = query(
            collection(db, 'users'), 
            where('email', '==', email.trim().toLowerCase())
          );
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) userExists = true;
        } catch (checkErr) {
          console.warn("Firestore existence check restricted (permission-denied). OTP might be sent to existing users unless Email Enumeration Protection is disabled in Firebase Console.");
        }
      }

      // Final decision before sending OTP
      if (userExists) {
        setError('This email is already registered. Try logging in.');
        setLoading(false);
        return;
      }

      // 2. Proceed with OTP
      const code = generateOTP();
      setSentOtp(code);
      setOtpSentTime(Date.now());

      const emailSent = await sendOTPEmail(email.trim(), code);
      if (!emailSent) {
        throw new Error('Failed to send OTP email. Please check your email address or try again later.');
      }
      setError(''); // Clear any previous errors before moving to step 2
      setStep(2);
      setResendTimer(60);
    } catch (err) {
      console.error("Registration Step 1 Error:", err);
      const msg = err.code ? getFirebaseErrorMessage(err.code) : (err.message || 'Something went wrong.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    if (loading) return; // Prevent double submission

    if (otp.length < 6) {
      setError('Please enter the 6-digit code.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Check expiration (5 minutes validity)
      if (Date.now() - otpSentTime > 5 * 60 * 1000) {
        setError('OTP has expired. Please request a new one.');
        setLoading(false);
        return;
      }

      // Check code match
      if (otp === sentOtp) {
        // Final registration
        await register(email.trim(), password, displayName.trim());
        setPlayVideo(true);
      } else {
        setError('Incorrect OTP code.');
        setLoading(false); // Reset loading so they can try again
      }
    } catch (err) {
      console.error("Registration Error:", err);
      setError(getFirebaseErrorMessage(err?.code || 'auth/unknown'));
      setLoading(false);
    }
  };

  if (playVideo) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden'
      }}>
        <video
          src="/Introduction_Video.mp4"
          autoPlay
          playsInline
          controls={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
          onEnded={() => navigate('/terms')}
          onError={(e) => {
            console.error("Welcome video play failed", e);
            navigate('/terms');
          }}
        />
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Exact same video ambient wallpaper as Login */}
      <AmbientBackground />

      {/* Cosmic constellation node network backdrop overlay */}
      <CosmicCanvas isInsideForm={isInsideForm} />

      {/* Kinetic floating particles */}
      <div style={styles.particlesContainer} aria-hidden="true">
        {[...Array(18)].map((_, i) => (
          <div key={i} style={{ ...styles.particle, ...getParticleStyle(i) }} />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={styles.card}
        onMouseEnter={() => setIsInsideForm(true)}
        onMouseLeave={() => setIsInsideForm(false)}
      >
        <div style={styles.logoArea}>
          <img src="/logo.png" alt="ToolKit Logo" style={{ width: '56px', height: '56px', objectFit: 'contain', marginBottom: '8px' }} />
          <h1 style={styles.brandName}>ToolKit</h1>
          <p style={styles.tagline}>Create your professional account</p>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.errorAlert}>
            <span style={styles.errorText}>{error}</span>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.form
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleSendOTP}
              style={styles.form}
            >
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Full Name</label>
                <div style={styles.inputWrapper}>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="John Doe"
                    style={styles.input}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Email Address</label>
                <div style={styles.inputWrapper}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    style={styles.input}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Password</label>
                <div style={styles.inputWrapper}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    style={styles.input}
                    disabled={loading}
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                    <EyeIcon open={showPassword} />
                  </button>
                </div>

                {/* Scoped mechanical vault indicator */}
                <div
                  className={`lock ${password ? 'is-lit' : ''}`}
                  id="lock"
                  ref={lockRef}
                  style={{ display: password ? 'flex' : 'none' }}
                >
                  <button
                    type="button"
                    className="sound-toggle-btn"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--on-panel-dim)',
                      cursor: 'pointer',
                      position: 'absolute',
                      right: '12px',
                      top: '12px',
                      fontSize: '14px',
                      zIndex: 5,
                      padding: '2px',
                    }}
                    title={soundEnabled ? "Mute sounds" : "Unmute sounds"}
                  >
                    {soundEnabled ? '🔊' : '🔇'}
                  </button>

                  <div className="chip">
                    <div className="door" id="door">
                      <svg className="door__svg" viewBox="150 150 260 260" fill="none" aria-hidden="true">
                        <defs>
                          <linearGradient id="v-plate" x1=".1" y1="0" x2=".9" y2="1">
                            <stop offset="0"   stopColor="#79838f"/>
                            <stop offset=".3"  stopColor="#59636f"/>
                            <stop offset=".6"  stopColor="#454e59"/>
                            <stop offset="1"   stopColor="#333b45"/>
                          </linearGradient>
                          <linearGradient id="v-steel" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0"   stopColor="#d3dae2"/>
                            <stop offset=".42" stopColor="#939dab"/>
                            <stop offset=".55" stopColor="#7a8492"/>
                            <stop offset="1"   stopColor="#525b68"/>
                          </linearGradient>
                          <linearGradient id="v-chrome" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0"   stopColor="#f1f5f9"/>
                            <stop offset=".3"  stopColor="#aab4c0"/>
                            <stop offset=".52" stopColor="#e8edf2"/>
                            <stop offset=".7"  stopColor="#8d97a4"/>
                            <stop offset="1"   stopColor="#c3ccd6"/>
                          </linearGradient>
                          <linearGradient id="v-wire" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0"   stopColor="#e8eef4"/>
                            <stop offset=".5"  stopColor="#9aa5b3"/>
                            <stop offset="1"   stopColor="#d4dce4"/>
                          </linearGradient>
                          <radialGradient id="v-face" cx=".36" cy=".3" r=".78">
                            <stop offset="0"   stopColor="#9aa5b2"/>
                            <stop offset=".45" stopColor="#69737f"/>
                            <stop offset=".8"  stopColor="#454e58"/>
                            <stop offset="1"   stopColor="#333a43"/>
                          </radialGradient>
                          <radialGradient id="v-led" cx=".4" cy=".38" r=".7">
                            <stop offset="0"   stopColor="#ffffff"/>
                            <stop offset=".45" stopColor="currentColor"/>
                            <stop offset="1"   stopColor="currentColor" stopOpacity=".25"/>
                          </radialGradient>
                        </defs>

                        <g className="plate">
                          <rect x="80" y="80" width="400" height="400" rx="16" fill="url(#v-plate)"/>
                          <rect className="seam__glow" x="270" y="80" width="20" height="400"/>
                          <rect className="seam" x="277" y="80" width="6" height="400" fill="#151a20"/>
                        </g>

                        <g className="clip">
                          <g className="clip__wob">
                            <path className="clip__wire"
                                  d="M233 288 Q230 268 248 266 L360 266 A17 17 0 0 0 360 232 L330 232 A10 10 0 0 0 330 252 L354 252"
                                  stroke="url(#v-wire)" strokeWidth="6.5" strokeLinecap="round"
                                  strokeLinejoin="round" fill="none"/>
                          </g>
                        </g>

                        <g className="hasp">
                          <g className="ear">
                            <path fill="url(#v-steel)" fillRule="evenodd"
                                  d="M247 242 H260 A7 7 0 0 1 267 249 V295 A7 7 0 0 1 260 302 H247 A7 7 0 0 1 240 295 V249 A7 7 0 0 1 247 242 Z
                                     M261 266 A7.5 7.5 0 1 1 246 266 A7.5 7.5 0 1 1 261 266 Z"/>
                            <circle cx="253.5" cy="266" r="8.4" fill="none" stroke="rgba(6,10,14,.6)" strokeWidth="2"/>
                          </g>
                          <g className="ear">
                            <path fill="url(#v-steel)" fillRule="evenodd"
                                  d="M300 242 H313 A7 7 0 0 1 320 249 V295 A7 7 0 0 1 313 302 H300 A7 7 0 0 1 293 295 V249 A7 7 0 0 1 300 242 Z
                                     M314 266 A7.5 7.5 0 1 1 299 266 A7.5 7.5 0 1 1 314 266 Z"/>
                            <circle cx="306.5" cy="266" r="8.4" fill="none" stroke="rgba(6,10,14,.6)" strokeWidth="2"/>
                          </g>
                        </g>

                        <g className="pad">
                          <g className="pad__sway">
                            <path className="pad__shackle" d="M253.5 312 L253.5 214 A26.5 26.5 0 0 1 306.5 214 L306.5 312"
                                  stroke="url(#v-chrome)" strokeWidth="15" strokeLinecap="round" fill="none"/>
                            <g className="pad__body">
                              <rect x="230" y="286" width="100" height="106" rx="16" fill="url(#v-steel)"/>
                              <rect x="230.5" y="286.5" width="99" height="105" rx="15.5" stroke="rgba(255,255,255,.3)"/>
                              <circle cx="280" cy="328" r="14" fill="#151a20"/>
                              <path d="M280 328 L280 358" stroke="#151a20" strokeWidth="7" strokeLinecap="round"/>
                            </g>
                          </g>
                        </g>

                        <g className="bolt">
                          <clipPath id="v-boltclip"><rect x="278" y="250" width="60" height="44"/></clipPath>

                          <g className="bolt__house">
                            <rect x="168" y="230" width="110" height="86" rx="11" fill="url(#v-steel)"/>
                            <rect x="168.5" y="230.5" width="109" height="85" rx="10.5" stroke="rgba(255,255,255,.28)"/>
                            <g className="bolt__rivet"><circle cx="184" cy="246" r="4.5"/></g>
                            <g className="bolt__rivet"><circle cx="184" cy="300" r="4.5"/></g>
                            <g className="bolt__rivet"><circle cx="262" cy="246" r="4.5"/></g>
                            <g className="bolt__rivet"><circle cx="262" cy="300" r="4.5"/></g>
                          </g>

                          <g className="bolt__strike">
                            <rect x="284" y="230" width="96" height="86" rx="11" fill="url(#v-steel)"/>
                            <rect x="284.5" y="230.5" width="95" height="85" rx="10.5" stroke="rgba(255,255,255,.28)"/>
                            <rect x="284" y="250" width="54" height="44" rx="5" fill="#12171d"/>
                            <g className="bolt__rivet"><circle cx="362" cy="246" r="4.5"/></g>
                            <g className="bolt__rivet"><circle cx="362" cy="300" r="4.5"/></g>
                          </g>

                          <g clipPath="url(#v-boltclip)">
                            <g className="bolt__slug">
                              <rect x="208" y="256" width="70" height="32" rx="6" fill="url(#v-chrome)"/>
                              <rect x="208" y="256" width="70" height="7" rx="3.5" fill="rgba(255,255,255,.4)"/>
                            </g>
                          </g>

                          <g className="bolt__turn">
                            <circle cx="200" cy="273" r="21" fill="url(#v-steel)"/>
                            <circle cx="200" cy="273" r="21" stroke="rgba(255,255,255,.26)"/>
                            <g className="bolt__knob">
                              <rect x="192" y="254" width="16" height="38" rx="6" fill="#2c343d"/>
                              <rect x="195" y="257" width="4" height="32" rx="2" fill="rgba(255,255,255,.24)"/>
                            </g>
                          </g>
                        </g>

                        <g className="vault">
                          <circle cx="280" cy="280" r="106" fill="#20262e"/>

                          <g className="vbolts">
                            <g transform="rotate(0 280 280)"><rect className="vbolt" x="320" y="269" width="58" height="22" rx="5" fill="url(#v-chrome)"/></g>
                            <g transform="rotate(45 280 280)"><rect className="vbolt" x="320" y="269" width="58" height="22" rx="5" fill="url(#v-chrome)"/></g>
                            <g transform="rotate(90 280 280)"><rect className="vbolt" x="320" y="269" width="58" height="22" rx="5" fill="url(#v-chrome)"/></g>
                            <g transform="rotate(135 280 280)"><rect className="vbolt" x="320" y="269" width="58" height="22" rx="5" fill="url(#v-chrome)"/></g>
                            <g transform="rotate(180 280 280)"><rect className="vbolt" x="320" y="269" width="58" height="22" rx="5" fill="url(#v-chrome)"/></g>
                            <g transform="rotate(225 280 280)"><rect className="vbolt" x="320" y="269" width="58" height="22" rx="5" fill="url(#v-chrome)"/></g>
                            <g transform="rotate(270 280 280)"><rect className="vbolt" x="320" y="269" width="58" height="22" rx="5" fill="url(#v-chrome)"/></g>
                            <g transform="rotate(315 280 280)"><rect className="vbolt" x="320" y="269" width="58" height="22" rx="5" fill="url(#v-chrome)"/></g>
                          </g>

                          <circle cx="280" cy="280" r="100" fill="url(#v-face)"/>
                          <circle cx="280" cy="280" r="100" stroke="rgba(255,255,255,.2)" strokeWidth="2"/>
                          <circle cx="280" cy="280" r="91" stroke="rgba(10,14,18,.5)" strokeWidth="5"/>
                          <circle cx="280" cy="280" r="80" stroke="rgba(255,255,255,.1)" strokeWidth="1.5"/>
                          <circle cx="280" cy="280" r="73" stroke="rgba(230,240,250,.2)" strokeWidth="6" strokeDasharray="2 9"/>

                          <g className="wheel">
                            <g stroke="url(#v-chrome)" strokeWidth="9" strokeLinecap="round">
                              <line x1="280" y1="280" x2="326" y2="280"/>
                              <line x1="280" y1="280" x2="303" y2="319.8"/>
                              <line x1="280" y1="280" x2="257" y2="319.8"/>
                              <line x1="280" y1="280" x2="234" y2="280"/>
                              <line x1="280" y1="280" x2="257" y2="240.2"/>
                              <line x1="280" y1="280" x2="303" y2="240.2"/>
                            </g>
                            <circle cx="280" cy="280" r="46" stroke="url(#v-chrome)" strokeWidth="9"/>
                            <circle cx="280" cy="280" r="51" stroke="rgba(10,14,18,.35)" strokeWidth="1.5"/>
                            <circle cx="280" cy="280" r="17" fill="url(#v-steel)"/>
                            <circle cx="280" cy="280" r="17" stroke="rgba(255,255,255,.32)" strokeWidth="1.5"/>
                            <circle cx="280" cy="280" r="6" fill="#1a2028"/>
                          </g>

                          <g className="vault__lamp">
                            <circle className="lamp__halo" cx="280" cy="344" r="13"/>
                            <circle className="lamp__led" cx="280" cy="344" r="6" fill="url(#v-led)"/>
                          </g>
                        </g>

                        <circle className="shock" cx="280" cy="280" r="100" strokeWidth="3.5"/>
                      </svg>
                    </div>
                  </div>

                  <div className="gauge">
                    <div className="meter" aria-hidden="true">
                      <i className="seg" data-t="1"><b></b></i>
                      <i className="seg" data-t="2"><b></b></i>
                      <i className="seg" data-t="3"><b></b></i>
                      <i className="seg" data-t="4"><b></b></i>
                    </div>
                    <p className="verdict">
                      <b className="verdict__name" id="lockname">No lock at all</b>
                      <span className="verdict__crack" id="crack">The door is standing open.</span>
                    </p>
                    <p className="bits"><span id="bits">0</span> bits of entropy</p>
                  </div>
                </div>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Confirm Password</label>
                <div style={styles.inputWrapper}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    style={styles.input}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                style={styles.submitBtn}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? 'Sending OTP...' : 'Get Start OTP'}
              </motion.button>
            </motion.form>
          ) : (
            <motion.form
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleVerifyAndRegister}
              style={styles.form}
            >
              <div style={styles.otpHeader}>
                <p style={styles.otpInstruction}>
                  Enter the 6-digit code sent to <br />
                  <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>
                </p>
              </div>

              <div style={styles.fieldGroup}>
                <div style={styles.inputWrapper}>
                  <input
                    type="text"
                    maxLength="6"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="0 0 0 0 0 0"
                    style={styles.otpInput}
                    disabled={loading}
                    autoFocus
                  />
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                style={styles.submitBtn}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? 'Verifying...' : 'Verify & Register'}
              </motion.button>

              <div style={styles.resendArea}>
                {resendTimer > 0 ? (
                  <p style={styles.resendText}>Resend code in {resendTimer}s</p>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOTP}
                    disabled={loading}
                    style={styles.resendBtn}
                  >
                    Didn't receive code? Resend
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={styles.backBtn}
                >
                  Change Email
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <p style={styles.registerRow}>
          Already have an account?{' '}
          <Link to="/login" style={styles.registerLink}>
            Sign In
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

// Exact same particle positions + animation as Login
function getParticleStyle(i) {
  const positions = [
    { top: '8%',  left: '12%', size: 3, dur: 7,  delay: 0   },
    { top: '15%', left: '80%', size: 2, dur: 9,  delay: 1.5 },
    { top: '25%', left: '35%', size: 4, dur: 6,  delay: 0.8 },
    { top: '30%', left: '92%', size: 2, dur: 11, delay: 2   },
    { top: '45%', left: '5%',  size: 3, dur: 8,  delay: 0.4 },
    { top: '50%', left: '60%', size: 2, dur: 10, delay: 3   },
    { top: '60%', left: '20%', size: 5, dur: 7,  delay: 1.2 },
    { top: '68%', left: '75%', size: 3, dur: 9,  delay: 0.6 },
    { top: '75%', left: '45%', size: 2, dur: 12, delay: 2.5 },
    { top: '85%', left: '88%', size: 4, dur: 6,  delay: 1.8 },
    { top: '90%', left: '10%', size: 2, dur: 8,  delay: 0.2 },
    { top: '5%',  left: '55%', size: 3, dur: 10, delay: 3.5 },
    { top: '40%', left: '28%', size: 2, dur: 7,  delay: 1   },
    { top: '20%', left: '65%', size: 4, dur: 9,  delay: 4   },
    { top: '55%', left: '82%', size: 2, dur: 11, delay: 0.9 },
    { top: '70%', left: '55%', size: 3, dur: 8,  delay: 2.2 },
    { top: '35%', left: '8%',  size: 2, dur: 6,  delay: 3.8 },
    { top: '80%', left: '30%', size: 4, dur: 10, delay: 1.4 },
  ];
  const p = positions[i] || positions[0];
  const colors = ['#e91e8c', '#ff6b35', '#00d4ff', '#c9a96e'];
  const color = colors[i % colors.length];
  return {
    width: `${p.size}px`,
    height: `${p.size}px`,
    top: p.top,
    left: p.left,
    background: color,
    borderRadius: '50%',
    boxShadow: `0 0 ${p.size * 3}px ${color}`,
    animation: `float ${p.dur}s ease-in-out ${p.delay}s infinite alternate`,
    opacity: 0.6,
  };
}

// ── EXACT SAME STYLES AS LOGIN PAGE ─────────────────────────────────────────
const styles = {
  page: {
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: '#0c0c0c',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'Rajdhani', sans-serif",
    boxSizing: 'border-box',
  },
  particlesContainer: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 1,
  },
  particle: { position: 'absolute' },
  card: {
    position: 'relative',
    zIndex: 2,
    width: '100%',
    maxWidth: '500px',
    background: 'rgba(10, 10, 18, 0.18)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(12px) saturate(160%)',
    WebkitBackdropFilter: 'blur(12px) saturate(160%)',
    borderRadius: '24px',
    padding: '44px 38px 38px',
    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0px rgba(255, 255, 255, 0.05)',
    boxSizing: 'border-box',
  },
  logoArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '32px',
  },
  brandName: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '28px',
    fontWeight: '900',
    background: 'linear-gradient(135deg, #e91e8c, #ff6b35)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    backgroundSize: '200% 200%',
    margin: 0,
    letterSpacing: '2px',
  },
  tagline: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '14px',
    margin: 0,
    letterSpacing: '0.5px',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    background: 'rgba(255,77,109,0.12)',
    border: '1px solid rgba(255,77,109,0.30)',
    borderRadius: '10px',
    padding: '12px 14px',
    marginBottom: '20px',
  },
  errorText: { color: '#ff6b84', fontSize: '13px', lineHeight: 1.5 },
  form: { display: 'flex', flexDirection: 'column', gap: '18px' },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: '7px' },
  label: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: '12px',
    fontWeight: '700',
    letterSpacing: '0.8px',
    textTransform: 'uppercase',
    fontFamily: "'Rajdhani', sans-serif",
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    color: 'rgba(255, 255, 255, 0.4)',
  },
  input: {
    width: '100%',
    padding: '13px 44px 13px 16px',
    background: 'rgba(0, 0, 0, 0.15)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: '10px',
    color: '#ffffff',
    fontSize: '15px',
    fontFamily: "'Rajdhani', sans-serif",
    fontWeight: '500',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
    minHeight: '48px',
  },
  eyeBtn: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'rgba(255, 255, 255, 0.4)',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    minWidth: '32px',
    minHeight: '32px',
  },
  submitBtn: {
    width: '100%',
    padding: '14px',
    marginTop: '6px',
    background: 'linear-gradient(135deg, #e91e8c 0%, #ff6b35 100%)',
    border: 'none',
    borderRadius: '10px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '700',
    fontFamily: "'Orbitron', sans-serif",
    letterSpacing: '1.5px',
    cursor: 'pointer',
    minHeight: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 24px rgba(233, 30, 140, 0.35)',
  },
  registerRow: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: '14px',
    marginTop: '24px',
    marginBottom: 0,
  },
  registerLink: {
    color: '#ff7e5f',
    textDecoration: 'none',
    fontWeight: '700',
  },
  otpHeader: { textAlign: 'center', marginBottom: '10px' },
  otpInstruction: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '14px',
    lineHeight: '1.6',
  },
  otpInput: {
    width: '100%',
    padding: '16px',
    background: 'rgba(0, 0, 0, 0.15)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '28px',
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: '8px',
    outline: 'none',
    fontFamily: "'Orbitron', sans-serif",
    transition: 'border-color 0.3s ease',
    boxSizing: 'border-box',
  },
  resendArea: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginTop: '20px' },
  resendText: { color: 'rgba(255, 255, 255, 0.4)', fontSize: '13px' },
  resendBtn: {
    background: 'none',
    border: 'none',
    color: '#ff7e5f',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    padding: 0,
    fontFamily: "'Rajdhani', sans-serif",
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    padding: 0,
    marginTop: '15px',
    alignSelf: 'center',
  },
};