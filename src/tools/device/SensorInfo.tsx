import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';

interface SensorData {
  accelerometer: { available: boolean; granted: boolean; x: string | number; y: string | number; z: string | number };
  gyroscope: { available: boolean; granted: boolean; x: string | number; y: string | number; z: string | number };
  orientation: { available: boolean; granted: boolean; alpha: string | number; beta: string | number; gamma: string | number };
  magnetometer: { available: boolean; granted: boolean; x: string | number; y: string | number; z: string | number };
  ambientLight: { available: boolean; granted: boolean; lux: string | number };
  geolocation: { available: boolean; granted: boolean; lat: string | null; lng: string | null; acc: string | null };
}

export default function SensorInfo() {
  const [sensors, setSensors] = useState<SensorData>({
    accelerometer: { available: false, granted: false, x: 0, y: 0, z: 0 },
    gyroscope:     { available: false, granted: false, x: 0, y: 0, z: 0 },
    orientation:   { available: false, granted: false, alpha: 0, beta: 0, gamma: 0 },
    magnetometer:  { available: false, granted: false, x: 0, y: 0, z: 0 },
    ambientLight:  { available: false, granted: false, lux: 0 },
    geolocation:   { available: false, granted: false, lat: null, lng: null, acc: null },
  });

  const [permRequested, setPermRequested] = useState(false);
  const listenersRef = useRef<Array<() => void>>([]);
  const watchRef = useRef<number | null>(null);

  // Latest raw readings to be throttled
  const rawReadings = useRef({
    accelerometer: { x: 0, y: 0, z: 0 },
    gyroscope: { x: 0, y: 0, z: 0 },
    orientation: { alpha: 0, beta: 0, gamma: 0 },
    magnetometer: { x: 0, y: 0, z: 0 },
    ambientLight: { lux: 0 },
    geolocation: { lat: null as string | null, lng: null as string | null, acc: null as string | null }
  });

  // Check static availability on mount
  useEffect(() => {
    setSensors(s => ({
      ...s,
      accelerometer: { ...s.accelerometer, available: "DeviceMotionEvent" in window },
      gyroscope:     { ...s.gyroscope,     available: "DeviceMotionEvent" in window },
      orientation:   { ...s.orientation,   available: "DeviceOrientationEvent" in window },
      magnetometer:  { ...s.magnetometer,  available: "DeviceOrientationEvent" in window },
      ambientLight:  { ...s.ambientLight,  available: "AmbientLightSensor" in window },
      geolocation:   { ...s.geolocation,   available: "geolocation" in navigator },
    }));
  }, []);

  const requestAll = async () => {
    setPermRequested(true);

    // iOS permission for motion/orientation
    const anyWin = window as any;
    if (typeof anyWin.DeviceMotionEvent?.requestPermission === "function") {
      try { await anyWin.DeviceMotionEvent.requestPermission(); } catch {}
    }
    if (typeof anyWin.DeviceOrientationEvent?.requestPermission === "function") {
      try { await anyWin.DeviceOrientationEvent.requestPermission(); } catch {}
    }

    // Motion handler
    const motionHandler = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      const rot = e.rotationRate;
      
      if (acc) {
        rawReadings.current.accelerometer = {
          x: acc.x ?? 0,
          y: acc.y ?? 0,
          z: acc.z ?? 0
        };
      }
      if (rot) {
        rawReadings.current.gyroscope = {
          x: rot.alpha ?? 0,
          y: rot.beta ?? 0,
          z: rot.gamma ?? 0
        };
      }
      
      setSensors(s => {
        if (!s.accelerometer.granted || !s.gyroscope.granted) {
          return {
            ...s,
            accelerometer: { ...s.accelerometer, granted: true },
            gyroscope: { ...s.gyroscope, granted: true }
          };
        }
        return s;
      });
    };
    window.addEventListener("devicemotion", motionHandler);
    listenersRef.current.push(() => window.removeEventListener("devicemotion", motionHandler));

    // Orientation handler
    const oriHandler = (e: DeviceOrientationEvent) => {
      rawReadings.current.orientation = {
        alpha: e.alpha ?? 0,
        beta: e.beta ?? 0,
        gamma: e.gamma ?? 0
      };
      // magnetometer proxy
      rawReadings.current.magnetometer = {
        x: e.alpha ?? 0,
        y: e.beta ?? 0,
        z: e.gamma ?? 0
      };

      setSensors(s => {
        if (!s.orientation.granted || !s.magnetometer.granted) {
          return {
            ...s,
            orientation: { ...s.orientation, granted: true },
            magnetometer: { ...s.magnetometer, granted: true }
          };
        }
        return s;
      });
    };
    window.addEventListener("deviceorientationabsolute", oriHandler, true);
    window.addEventListener("deviceorientation", oriHandler, true);
    listenersRef.current.push(() => {
      window.removeEventListener("deviceorientationabsolute", oriHandler, true);
      window.removeEventListener("deviceorientation", oriHandler, true);
    });

    // Geolocation
    if (navigator.geolocation) {
      watchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          rawReadings.current.geolocation = {
            lat: pos.coords.latitude.toFixed(5),
            lng: pos.coords.longitude.toFixed(5),
            acc: pos.coords.accuracy?.toFixed(1) ?? null
          };
          setSensors(s => ({
            ...s,
            geolocation: { ...s.geolocation, granted: true }
          }));
        },
        () => setSensors(s => ({ ...s, geolocation: { ...s.geolocation, granted: false } })),
        { enableHighAccuracy: true }
      );
    }

    // Ambient Light
    if ("AmbientLightSensor" in window) {
      try {
        const ALS = (window as any).AmbientLightSensor;
        const als = new ALS();
        als.addEventListener("reading", () => {
          rawReadings.current.ambientLight = {
            lux: als.illuminance?.toFixed(1) ?? 0
          };
          setSensors(s => ({
            ...s,
            ambientLight: { ...s.ambientLight, granted: true }
          }));
        });
        als.start();
        listenersRef.current.push(() => als.stop());
      } catch {}
    }
  };

  // Throttle state updates to 5Hz (every 200ms) with low-pass filter (LPF) and dead-zone (0.05 threshold)
  useEffect(() => {
    if (!permRequested) return;

    const interval = setInterval(() => {
      setSensors(prev => {
        const filterVal = (curr: number, prevVal: string | number) => {
          const p = typeof prevVal === 'string' ? parseFloat(prevVal) : prevVal;
          if (isNaN(p)) return curr.toFixed(2);
          // Dead-zone: don't update if difference is tiny (< 0.05)
          if (Math.abs(curr - p) < 0.05) return p.toFixed(2);
          // LPF smoothing
          const smoothed = p + 0.35 * (curr - p);
          return smoothed.toFixed(2);
        };

        const filterAngle = (curr: number, prevVal: string | number) => {
          const p = typeof prevVal === 'string' ? parseFloat(prevVal) : prevVal;
          if (isNaN(p)) return curr.toFixed(1);
          // Dead-zone for orientation: 0.1 deg
          if (Math.abs(curr - p) < 0.1) return p.toFixed(1);
          const smoothed = p + 0.35 * (curr - p);
          return smoothed.toFixed(1);
        };

        const raw = rawReadings.current;
        return {
          ...prev,
          accelerometer: {
            ...prev.accelerometer,
            x: filterVal(raw.accelerometer.x, prev.accelerometer.x),
            y: filterVal(raw.accelerometer.y, prev.accelerometer.y),
            z: filterVal(raw.accelerometer.z, prev.accelerometer.z),
          },
          gyroscope: {
            ...prev.gyroscope,
            x: filterVal(raw.gyroscope.x, prev.gyroscope.x),
            y: filterVal(raw.gyroscope.y, prev.gyroscope.y),
            z: filterVal(raw.gyroscope.z, prev.gyroscope.z),
          },
          orientation: {
            ...prev.orientation,
            alpha: filterAngle(raw.orientation.alpha, prev.orientation.alpha),
            beta: filterAngle(raw.orientation.beta, prev.orientation.beta),
            gamma: filterAngle(raw.orientation.gamma, prev.orientation.gamma),
          },
          magnetometer: {
            ...prev.magnetometer,
            x: filterAngle(raw.magnetometer.x, prev.magnetometer.x),
            y: filterAngle(raw.magnetometer.y, prev.magnetometer.y),
            z: filterAngle(raw.magnetometer.z, prev.magnetometer.z),
          },
          ambientLight: {
            ...prev.ambientLight,
            lux: typeof raw.ambientLight.lux === 'number' ? raw.ambientLight.lux.toFixed(1) : raw.ambientLight.lux
          },
          geolocation: {
            ...prev.geolocation,
            lat: raw.geolocation.lat,
            lng: raw.geolocation.lng,
            acc: raw.geolocation.acc
          }
        };
      });
    }, 200);

    return () => clearInterval(interval);
  }, [permRequested]);

  // Clean up listeners on unmount
  useEffect(() => {
    return () => {
      listenersRef.current.forEach(fn => fn());
      if (watchRef.current !== null) {
        navigator.geolocation?.clearWatch(watchRef.current);
      }
    };
  }, []);

  const sensorDefs = [
    {
      key: "accelerometer" as const,
      name: "Accelerometer",
      icon: "📱",
      desc: "Linear acceleration (with gravity)",
      color: "#00d4ff",
      readings: (s: any) => [
        { axis: "X", val: s.x, unit: "m/s²" },
        { axis: "Y", val: s.y, unit: "m/s²" },
        { axis: "Z", val: s.z, unit: "m/s²" },
      ],
    },
    {
      key: "gyroscope" as const,
      name: "Gyroscope",
      icon: "🌀",
      desc: "Rotational velocity rate",
      color: "#c9a96e",
      readings: (s: any) => [
        { axis: "α", val: s.x, unit: "°/s" },
        { axis: "β", val: s.y, unit: "°/s" },
        { axis: "γ", val: s.z, unit: "°/s" },
      ],
    },
    {
      key: "orientation" as const,
      name: "Device Orientation",
      icon: "🧭",
      desc: "Rotation orientation in 3D space",
      color: "#e91e8c",
      readings: (s: any) => [
        { axis: "Alpha", val: s.alpha, unit: "°" },
        { axis: "Beta",  val: s.beta,  unit: "°" },
        { axis: "Gamma", val: s.gamma, unit: "°" },
      ],
    },
    {
      key: "magnetometer" as const,
      name: "Magnetometer",
      icon: "🧲",
      desc: "Proxy magnetic orientation values",
      color: "#00d4ff",
      readings: (s: any) => [
        { axis: "X", val: s.x, unit: "μT" },
        { axis: "Y", val: s.y, unit: "μT" },
        { axis: "Z", val: s.z, unit: "μT" },
      ],
    },
    {
      key: "ambientLight" as const,
      name: "Ambient Light",
      icon: "💡",
      desc: "Environmental illuminance level",
      color: "#c9a96e",
      readings: (s: any) => [{ axis: "Lux", val: s.lux, unit: "lx" }],
    },
    {
      key: "geolocation" as const,
      name: "GPS / Geolocation",
      icon: "📍",
      desc: "Device real-time geographic position",
      color: "#e91e8c",
      readings: (s: any) => [
        { axis: "Latitude",  val: s.lat ?? "—", unit: "°" },
        { axis: "Longitude", val: s.lng ?? "—", unit: "°" },
        { axis: "Accuracy",  val: s.acc ?? "—", unit: "m" },
      ],
    },
  ];

  return (
    <ToolWrapper toolName="Sensor Info">
      <div style={styles.container}>
        <div style={styles.header}>
          <p style={styles.subtitle}>
            Live readings smoothed to 5Hz to prevent value flickering.
          </p>
        </div>

        {!permRequested && (
          <motion.button 
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.98 }}
            onClick={requestAll}
            style={styles.requestBtn}
          >
            ACTIVATE ALL SENSORS
          </motion.button>
        )}

        <div style={styles.grid}>
          {sensorDefs.map((def, i) => {
            const s = sensors[def.key];
            const readings = def.readings(s);
            return (
              <motion.div 
                key={def.key}
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{
                  ...styles.card,
                  borderColor: s.available ? (s.granted ? `${def.color}44` : 'var(--color-border)') : 'rgba(239, 68, 68, 0.2)',
                  borderLeft: `4px solid ${s.available ? (s.granted ? def.color : 'var(--color-text-muted)') : '#ef4444'}`,
                }}
              >
                <div style={styles.cardHeader}>
                  <div style={styles.cardTitleBox}>
                    <span style={styles.cardIcon}>{def.icon}</span>
                    <div>
                      <div style={{ ...styles.cardTitle, color: s.granted ? def.color : 'var(--color-text-main)' }}>{def.name}</div>
                      <div style={styles.cardDesc}>{def.desc}</div>
                    </div>
                  </div>
                  
                  <div style={styles.statusBadge}>
                    {s.granted && (
                      <motion.div 
                        animate={{ opacity: [0.5, 1, 0.5] }} 
                        transition={{ duration: 1.2, repeat: Infinity }}
                        style={{ ...styles.statusDot, background: def.color }} 
                      />
                    )}
                    <span style={{ 
                      fontSize: '10px', 
                      fontWeight: 'bold',
                      color: !s.available ? '#ef4444' : s.granted ? def.color : 'var(--color-text-muted)' 
                    }}>
                      {!s.available ? "UNSUPPORTED" : s.granted ? "LIVE" : "STANDBY"}
                    </span>
                  </div>
                </div>

                {s.granted ? (
                  <div style={{
                    ...styles.readingsBox,
                    gridTemplateColumns: `repeat(${Math.min(readings.length, 3)}, 1fr)`
                  }}>
                    {readings.map(r => (
                      <div key={r.axis} style={styles.readingCol}>
                        <div style={styles.axisLabel}>{r.axis}</div>
                        <div style={{ ...styles.axisValue, color: def.color }}>{r.val}</div>
                        <div style={styles.axisUnit}>{r.unit}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={styles.placeholderMsg}>
                    {!s.available 
                      ? "Sensor is not supported by your browser or device." 
                      : "Permission required. Click Activate above."}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px', maxWidth: '640px', margin: '0 auto', color: 'var(--color-text-main)' },
  header: { textAlign: 'center', marginBottom: '8px' },
  subtitle: { fontSize: '14px', color: 'var(--color-text-muted)', marginTop: '4px' },
  requestBtn: {
    width: '100%',
    padding: '16px',
    borderRadius: '16px',
    border: 'none',
    cursor: 'pointer',
    background: 'var(--color-accent)',
    color: 'var(--color-bg-main, #000)',
    fontSize: '13px',
    fontWeight: 'bold',
    letterSpacing: '1px',
    boxShadow: '0 4px 12px var(--color-accent-dim, rgba(0,0,0,0.1))',
  },
  grid: { display: 'flex', flexDirection: 'column', gap: '12px' },
  card: {
    background: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '20px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    transition: 'all 0.2s ease',
  },
  cardHeader: {
    padding: '14px 18px',
    borderBottom: '1px solid var(--color-border)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitleBox: { display: 'flex', alignItems: 'center', gap: '12px' },
  cardIcon: { fontSize: '20px' },
  cardTitle: { fontSize: '14px', fontWeight: 'bold', letterSpacing: '0.5px' },
  cardDesc: { fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' },
  statusBadge: { display: 'flex', alignItems: 'center', gap: '6px' },
  statusDot: { width: '8px', height: '8px', borderRadius: '50%' },
  readingsBox: { padding: '14px 18px', display: 'grid', gap: '10px' },
  readingCol: { textAlign: 'center' },
  axisLabel: { fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '2px' },
  axisValue: { fontSize: '18px', fontWeight: 'bold', fontFamily: 'monospace' },
  axisUnit: { fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px' },
  placeholderMsg: { padding: '14px 18px', fontSize: '13px', color: 'var(--color-text-muted)' }
};
