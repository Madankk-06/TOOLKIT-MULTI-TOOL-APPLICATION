import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';
import { useTheme } from '../../context/ThemeContext';

interface SensorStatus {
  type: string;
  accuracy: string | number;
  isAbsolute: boolean;
}

export default function Compass() {
  const { tokens } = useTheme();
  const [heading, setHeading] = useState<number | null>(null);
  const [renderRotation, setRenderRotation] = useState<number>(0);
  const [sensorStatus, setSensorStatus] = useState<SensorStatus>({
    type: 'None',
    accuracy: '—',
    isAbsolute: false
  });
  
  const [tilt, setTilt] = useState({ beta: 0, gamma: 0 });
  const [showCalibrate, setShowCalibrate] = useState(false);
  const [active, setActive] = useState(false);
  const [error, setError] = useState('');
  const [unsupported, setUnsupported] = useState(false);

  const headingRef = useRef<number | null>(null);
  const continuousRotationRef = useRef<number>(0);
  const sensorRef = useRef<any>(null);

  // Calculates direction label from heading
  const getDirection = (h: number) => {
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return dirs[Math.round(h / 22.5) % 16];
  };

  // Smooths heading changes and calculates continuous rotation to prevent Framer Motion spins
  const updateHeading = useCallback((rawHeading: number) => {
    // Normalise heading to [0, 360)
    const targetHeading = (rawHeading + 360) % 360;

    if (headingRef.current === null) {
      headingRef.current = targetHeading;
      continuousRotationRef.current = -targetHeading;
    } else {
      // Find shortest path between current and target heading
      let diff = targetHeading - headingRef.current;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;

      // Low-pass filter (0.15 smoothing speed)
      const smoothedDiff = 0.15 * diff;
      headingRef.current = (headingRef.current + smoothedDiff + 360) % 360;

      // Subtract the smoothed difference to rotate dial in opposite direction
      continuousRotationRef.current -= smoothedDiff;
    }

    setHeading(Math.round(headingRef.current));
    setRenderRotation(continuousRotationRef.current);
  }, []);

  // Standard W3C tilt compensation algorithm
  const calculateTiltCompensatedHeading = (alpha: number, beta: number, gamma: number) => {
    const degToRad = Math.PI / 180;
    const a = alpha * degToRad;
    const b = beta * degToRad;
    const g = gamma * degToRad;

    // Project device vector onto horizontal plane
    const x = Math.sin(a) * Math.cos(g) + Math.cos(a) * Math.sin(b) * Math.sin(g);
    const y = Math.cos(a) * Math.cos(g) - Math.sin(a) * Math.sin(b) * Math.sin(g);

    let compHeading = Math.atan2(x, y) * (180 / Math.PI);
    if (compHeading < 0) compHeading += 360;
    
    // Normalise heading direction (clockwise)
    return (360 - compHeading) % 360;
  };

  const startCompass = async () => {
    setError('');
    setUnsupported(false);
    
    const anyWin = window as any;

    // Request permissions for iOS 13+ motion sensors
    if (typeof anyWin.DeviceOrientationEvent?.requestPermission === 'function') {
      try {
        const state = await anyWin.DeviceOrientationEvent.requestPermission();
        if (state === 'granted') {
          initSensors();
        } else {
          setError('Permission denied. Please allow sensor access to use the compass.');
        }
      } catch (err) {
        setError('Error requesting device orientation permission.');
      }
    } else {
      initSensors();
    }
  };

  const initSensors = () => {
    setActive(true);

    // 1. Try modern AbsoluteOrientationSensor (Generic Sensor API)
    if ('AbsoluteOrientationSensor' in window && 'navigator' in window && (navigator as any).permissions) {
      Promise.all([
        (navigator as any).permissions.query({ name: 'accelerometer' }),
        (navigator as any).permissions.query({ name: 'gyroscope' }),
        (navigator as any).permissions.query({ name: 'magnetometer' })
      ])
      .then((results) => {
        if (results.every(result => result.state === 'granted')) {
          try {
            const AbsoluteClass = (window as any).AbsoluteOrientationSensor;
            sensorRef.current = new AbsoluteClass({ frequency: 30 });
            sensorRef.current.addEventListener('reading', () => {
              const q = sensorRef.current.quaternion;
              if (q) {
                // Calculate yaw/heading from quaternion [x, y, z, w]
                let headingRad = Math.atan2(
                  2 * (q[0] * q[1] + q[2] * q[3]), 
                  1 - 2 * (q[1] * q[1] + q[2] * q[2])
                );
                let headingDeg = headingRad * (180 / Math.PI);
                if (headingDeg < 0) headingDeg += 360;
                updateHeading(headingDeg);
                setSensorStatus({
                  type: 'Absolute Sensor API',
                  accuracy: 'High',
                  isAbsolute: true
                });
              }
            });
            sensorRef.current.start();
            return;
          } catch (e) {
            // Fall back if instantiation fails
          }
        }
        setupDeviceOrientationListeners();
      })
      .catch(() => {
        setupDeviceOrientationListeners();
      });
    } else {
      setupDeviceOrientationListeners();
    }
  };

  const setupDeviceOrientationListeners = () => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    // iOS Listener (prefers webkitCompassHeading)
    const handleIOSOrientation = (e: DeviceOrientationEvent) => {
      const h = (e as any).webkitCompassHeading;
      setTilt({ beta: e.beta ?? 0, gamma: e.gamma ?? 0 });
      if (h !== undefined && h !== null) {
        updateHeading(h);
        setUnsupported(false);
        setSensorStatus({
          type: 'iOS Webkit Compass',
          accuracy: (e as any).webkitCompassAccuracy ?? 'High',
          isAbsolute: true
        });
      } else {
        setUnsupported(true);
      }
    };

    // Android/Standard Absolute Listener
    const handleAndroidAbsoluteOrientation = (e: DeviceOrientationEvent) => {
      setTilt({ beta: e.beta ?? 0, gamma: e.gamma ?? 0 });
      if (e.alpha !== null && e.alpha !== undefined) {
        const compHeading = calculateTiltCompensatedHeading(e.alpha, e.beta ?? 0, e.gamma ?? 0);
        updateHeading(compHeading);
        setUnsupported(false);
        setSensorStatus({
          type: 'Absolute Orientation Event',
          accuracy: 'Medium',
          isAbsolute: true
        });
      } else {
        setUnsupported(true);
      }
    };

    // Relative Fallback Listener
    const handleRelativeOrientation = (e: DeviceOrientationEvent) => {
      setTilt({ beta: e.beta ?? 0, gamma: e.gamma ?? 0 });
      if (e.alpha !== null && e.alpha !== undefined) {
        const compHeading = calculateTiltCompensatedHeading(e.alpha, e.beta ?? 0, e.gamma ?? 0);
        updateHeading(compHeading);
        setUnsupported(false);
        setSensorStatus({
          type: 'Relative Orientation Fallback',
          accuracy: 'Low (Relative)',
          isAbsolute: false
        });
      }
    };

    if (isIOS) {
      (window as any).addEventListener('deviceorientation', handleIOSOrientation, true);
      listenersCleanup.current = () => (window as any).removeEventListener('deviceorientation', handleIOSOrientation, true);
    } else if ('ondeviceorientationabsolute' in (window as any)) {
      (window as any).addEventListener('deviceorientationabsolute', handleAndroidAbsoluteOrientation, true);
      listenersCleanup.current = () => (window as any).removeEventListener('deviceorientationabsolute', handleAndroidAbsoluteOrientation, true);
    } else {
      (window as any).addEventListener('deviceorientation', handleRelativeOrientation, true);
      listenersCleanup.current = () => (window as any).removeEventListener('deviceorientation', handleRelativeOrientation, true);
    }

    // Safety timeout to display unsupported warning
    setTimeout(() => {
      if (headingRef.current === null) {
        setUnsupported(true);
      }
    }, 1500);
  };

  const listenersCleanup = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (sensorRef.current) sensorRef.current.stop();
      if (listenersCleanup.current) listenersCleanup.current();
    };
  }, []);

  const currentDir = heading !== null ? getDirection(heading) : '—';
  
  // Spirit level calculations: limit bubble displacement to circle boundary
  const bubbleScale = 0.8;
  const bubbleRadius = 8;
  const targetRadius = 36;
  const rawBubbleX = (tilt.gamma) * bubbleScale;
  const rawBubbleY = (tilt.beta) * bubbleScale;
  const bubbleDist = Math.hypot(rawBubbleX, rawBubbleY);
  const maxBubbleDist = targetRadius - bubbleRadius;
  
  const bubbleX = bubbleDist > maxBubbleDist 
    ? (rawBubbleX / bubbleDist) * maxBubbleDist 
    : rawBubbleX;
  const bubbleY = bubbleDist > maxBubbleDist 
    ? (rawBubbleY / bubbleDist) * maxBubbleDist 
    : rawBubbleY;
  
  const isLevel = Math.abs(tilt.beta) < 5 && Math.abs(tilt.gamma) < 5;

  return (
    <ToolWrapper toolName="Compass">
      <div style={styles.container}>
        
        {/* Active Sensor Status Ribbon */}
        {active && (
          <div style={{ ...styles.statusRibbon, background: tokens.surface, borderColor: tokens.border }}>
            <span style={{ color: tokens.textSecondary }}>Sensor: </span>
            <span style={{ color: tokens.accent, fontWeight: 'bold' }}>{sensorStatus.type}</span>
            <span style={styles.divider}>|</span>
            <span style={{ color: tokens.textSecondary }}>Accuracy: </span>
            <span style={{ color: sensorStatus.isAbsolute ? '#22C55E' : '#F59E0B', fontWeight: 'bold' }}>{sensorStatus.accuracy}</span>
          </div>
        )}

        <div style={styles.compassWrap}>
          {/* Rotating Adventure-Style Dial */}
          <motion.div 
            style={styles.dialBox}
            animate={{ rotate: renderRotation }}
            transition={{ type: 'tween', ease: 'linear', duration: 0.08 }}
          >
            <svg width="280" height="280" viewBox="0 0 280 280">
              <defs>
                <radialGradient id="compass-bg" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={tokens.surface} />
                  <stop offset="100%" stopColor={tokens.background} />
                </radialGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Dial Outer Ring */}
              <circle cx="140" cy="140" r="132" fill="url(#compass-bg)" stroke={tokens.border} strokeWidth="4" />
              <circle cx="140" cy="140" r="120" fill="none" stroke={tokens.border} strokeWidth="1" strokeDasharray="4 4" />
              
              {/* Heading Degree Ticks */}
              {Array.from({ length: 72 }, (_, i) => {
                const angle = (i * 5 - 90) * Math.PI / 180;
                const isMajor = i % 6 === 0; // major every 30 degrees
                const isN = i === 0;
                const rStart = 118;
                const rEnd = isN ? 102 : isMajor ? 108 : 113;
                return (
                  <line 
                    key={i} 
                    x1={140 + rStart * Math.cos(angle)} 
                    y1={140 + rStart * Math.sin(angle)} 
                    x2={140 + rEnd * Math.cos(angle)} 
                    y2={140 + rEnd * Math.sin(angle)} 
                    stroke={isN ? '#EF4444' : isMajor ? tokens.accent : tokens.border} 
                    strokeWidth={isN ? 3 : isMajor ? 2 : 1} 
                    style={{ opacity: isMajor ? 0.9 : 0.4 }}
                  />
                );
              })}

              {/* Ticks Degree Numbers */}
              {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => {
                const angle = (deg - 90) * Math.PI / 180;
                const x = 140 + 96 * Math.cos(angle);
                const y = 140 + 96 * Math.sin(angle);
                return (
                  <text 
                    key={deg} 
                    x={x} 
                    y={y} 
                    textAnchor="middle" 
                    dominantBaseline="middle"
                    fill={tokens.textSecondary} 
                    fontSize="9" 
                    fontFamily="monospace"
                    fontWeight="bold"
                    style={{ opacity: 0.7 }}
                  >
                    {deg}
                  </text>
                );
              })}

              {/* Direction Letter Labels */}
              {[
                ['N', 0, '#EF4444', '18'],
                ['NE', 45, tokens.textPrimary, '11'],
                ['E', 90, tokens.textPrimary, '15'],
                ['SE', 135, tokens.textPrimary, '11'],
                ['S', 180, '#00d4ff', '15'],
                ['SW', 225, tokens.textPrimary, '11'],
                ['W', 270, tokens.textPrimary, '15'],
                ['NW', 315, tokens.textPrimary, '11']
              ].map(([lbl, deg, color, size]) => {
                const angle = ((deg as number) - 90) * Math.PI / 180;
                const x = 140 + 78 * Math.cos(angle);
                const y = 140 + 78 * Math.sin(angle);
                return (
                  <text 
                    key={lbl as string} 
                    x={x} 
                    y={y} 
                    textAnchor="middle" 
                    dominantBaseline="middle"
                    fill={color as string} 
                    fontSize={size as string}
                    fontWeight="900"
                  >
                    {lbl}
                  </text>
                );
              })}
            </svg>
          </motion.div>

          {/* Mini Spirit Level inside Dial Center */}
          <div style={{ ...styles.spiritLevel, background: tokens.background, borderColor: tokens.border }}>
            <div style={{ ...styles.spiritTarget, borderColor: isLevel ? '#22C55E' : 'rgba(255,255,255,0.1)' }} />
            <motion.div 
              style={{ ...styles.spiritBubble, background: isLevel ? '#22C55E' : '#F59E0B' }}
              animate={{ x: bubbleX, y: bubbleY }}
              transition={{ type: 'spring', damping: 15, stiffness: 120 }}
            />
          </div>

          {/* Stationary needle indicator pointing straight UP */}
          <div style={styles.needleOverlay}>
            <svg width="40" height="280" viewBox="0 0 40 280">
              {/* Top needle pointer (facing UP) */}
              <path d="M20 6 Q20 6 24 35 L16 35 Z" fill="#EF4444" filter="url(#glow)" />
              <circle cx="20" cy="140" r="4" fill="#EF4444" />
            </svg>
          </div>
        </div>

        {/* Heading Readout Panels */}
        <div style={styles.readout}>
          <div style={{ ...styles.headingNum, color: tokens.textPrimary }}>
            {heading !== null ? `${heading}°` : '—°'}
          </div>
          <div style={{ ...styles.headingDir, color: tokens.accent }}>
            {currentDir}
          </div>
        </div>

        {/* Warning messages */}
        <AnimatePresence>
          {!isLevel && active && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0 }} 
              style={{ ...styles.warningBox, background: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.2)', color: '#F59E0B' }}
            >
              ⚠️ Hold phone flat for accurate compass heading
            </motion.div>
          )}

          {unsupported && active && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0 }} 
              style={{ ...styles.warningBox, background: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.2)', color: '#EF4444' }}
            >
              ⚠️ No orientation readings detected. Ensure your device is on a flat surface and magnetometer is supported.
            </motion.div>
          )}
        </AnimatePresence>

        {/* Control Buttons */}
        <div style={styles.actionRow}>
          {!active ? (
            <motion.button 
              onClick={startCompass} 
              style={{ ...styles.primaryBtn, background: tokens.accent, color: tokens.surface }} 
              whileTap={{ scale: 0.96 }}
            >
              Unlock Compass
            </motion.button>
          ) : (
            <motion.button 
              onClick={() => setShowCalibrate(true)} 
              style={{ ...styles.secondaryBtn, background: tokens.surface, borderColor: tokens.border, color: tokens.textPrimary }}
              whileTap={{ scale: 0.96 }}
            >
              How to Calibrate
            </motion.button>
          )}
        </div>

        {/* Calibration instructions overlay */}
        <AnimatePresence>
          {showCalibrate && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              style={styles.modalOverlay}
              onClick={() => setShowCalibrate(false)}
            >
              <motion.div 
                initial={{ scale: 0.95, y: 20 }} 
                animate={{ scale: 1, y: 0 }} 
                exit={{ scale: 0.95, y: 20 }} 
                style={{ ...styles.modal, background: tokens.surface, borderColor: tokens.border }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 style={{ ...styles.modalTitle, color: tokens.textPrimary }}>Calibrate Compass</h3>
                <p style={{ ...styles.modalText, color: tokens.textSecondary }}>
                  If the compass readings are inaccurate or jumping, sweep your phone slowly in a figure-8 motion a few times.
                </p>
                <div style={styles.fig8AnimationBox}>
                  <svg width="120" height="60" viewBox="0 0 120 60">
                    <path 
                      d="M 30,30 C 30,15 10,15 10,30 C 10,45 30,45 30,30 C 30,15 90,45 90,30 C 90,15 110,15 110,30 C 110,45 90,45 90,30 C 90,15 30,45 30,30 Z" 
                      fill="none" 
                      stroke={tokens.accent} 
                      strokeWidth="3"
                      strokeDasharray="8 4"
                    />
                    <circle cx="30" cy="30" r="4" fill="#EF4444" />
                  </svg>
                </div>
                <button 
                  onClick={() => setShowCalibrate(false)} 
                  style={{ ...styles.primaryBtn, background: tokens.accent, color: tokens.surface, width: '100%' }}
                >
                  Close
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '10px' },
  statusRibbon: { display: 'flex', gap: '8px', fontSize: '11px', border: '1px solid', padding: '8px 16px', borderRadius: '20px' },
  divider: { opacity: 0.2 },
  compassWrap: { position: 'relative', width: '280px', height: '280px' },
  dialBox: { width: '280px', height: '280px', position: 'absolute', top: 0, left: 0 },
  needleOverlay: { position: 'absolute', top: 0, left: 120, width: '40px', height: '280px', pointerEvents: 'none', zIndex: 10 },
  spiritLevel: {
    position: 'absolute', top: 104, left: 104, width: '72px', height: '72px', 
    borderRadius: '50%', border: '1px dashed', display: 'flex', alignItems: 'center', 
    justifyContent: 'center', pointerEvents: 'none', zIndex: 5
  },
  spiritTarget: { position: 'absolute', width: '24px', height: '24px', borderRadius: '50%', border: '1px solid' },
  spiritBubble: { width: '12px', height: '12px', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' },
  readout: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' },
  headingNum: { fontSize: '48px', fontWeight: '900', fontFamily: 'monospace', lineHeight: 1 },
  headingDir: { fontSize: '18px', fontWeight: '800', letterSpacing: '2px' },
  warningBox: { border: '1px solid', padding: '10px 18px', borderRadius: '12px', fontSize: '12px', textAlign: 'center', maxWidth: '280px' },
  actionRow: { width: '100%', maxWidth: '240px' },
  primaryBtn: { border: 'none', borderRadius: '14px', fontSize: '14px', fontWeight: 'bold', padding: '14px 24px', cursor: 'pointer', width: '100%' },
  secondaryBtn: { border: '1px solid', borderRadius: '14px', fontSize: '13px', fontWeight: 'bold', padding: '12px 24px', cursor: 'pointer', width: '100%' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 },
  modal: { width: '85%', maxWidth: '340px', padding: '24px', borderRadius: '20px', border: '1px solid', display: 'flex', flexDirection: 'column', gap: '16px' },
  modalTitle: { fontSize: '18px', fontWeight: 'bold', textAlign: 'center' },
  modalText: { fontSize: '13px', textAlign: 'center', lineHeight: '1.5' },
  fig8AnimationBox: { display: 'flex', justifyContent: 'center', padding: '10px 0' }
};
