import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import ToolWrapper from '../../components/ToolWrapper';

export default function DigitalClock(props?: any) {
  const [time, setTime] = useState(new Date());
  const [is24Hour, setIs24Hour] = useState(false);
  const [showSeconds, setShowSeconds] = useState(true);
  const location = useLocation();

  useEffect(() => {
    let data = null;
        if (props && (props.params || props.aiPayload)) {
          data = props.params || props.aiPayload;
        } else if (location.state && (location.state.aiPayload || location.state.params)) {
          data = location.state.aiPayload || location.state.params;
        } else if (props && Object.keys(props).some(k => k !== 'standalone')) {
          data = props;
        }
    if (data && data.format) {
      if (data.format === '24h') {
        setIs24Hour(true);
      } else if (data.format === '12h') {
        setIs24Hour(false);
      }
    }
  }, [location.state]);

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 100);
    return () => clearInterval(id);
  }, []);

  const formatSegment = (val: number) => String(val).padStart(2, '0');
  
  const hoursRaw = time.getHours();
  const displayHours = is24Hour ? hoursRaw : (hoursRaw % 12 || 12);
  const ampm = hoursRaw >= 12 ? 'PM' : 'AM';
  
  const dayName = time.toLocaleDateString(undefined, { weekday: 'long' });
  const dateStr = time.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <ToolWrapper toolName="Digital Clock">
      <div style={styles.container}>
        <div style={styles.clockCard}>
          <div style={styles.timeArea}>
            <div style={styles.mainTime}>
              <span style={styles.segment}>{formatSegment(displayHours)}</span>
              <motion.span 
                animate={{ opacity: [1, 0.4, 1] }} 
                transition={{ repeat: Infinity, duration: 1 }} 
                style={styles.separator}
              >
                :
              </motion.span>
              <span style={styles.segment}>{formatSegment(time.getMinutes())}</span>
              {showSeconds && (
                <>
                  <span style={styles.separator}>:</span>
                  <span style={{ ...styles.segment, color: 'var(--color-accent)' }}>
                    {formatSegment(time.getSeconds())}
                  </span>
                </>
              )}
            </div>
            {!is24Hour && <div style={styles.ampm}>{ampm}</div>}
          </div>

          <div style={styles.dateArea}>
            <div style={styles.day}>{dayName}</div>
            <div style={styles.fullDate}>{dateStr}</div>
          </div>
        </div>

        <div style={styles.controls}>
          <button 
            onClick={() => setIs24Hour(!is24Hour)} 
            style={{ ...styles.toggle, ...(is24Hour ? styles.toggleActive : {}) }}
          >
            24H Format
          </button>
          <button 
            onClick={() => setShowSeconds(!showSeconds)} 
            style={{ ...styles.toggle, ...(showSeconds ? styles.toggleActive : {}) }}
          >
            Show Seconds
          </button>
        </div>

        <div style={styles.meta}>
          <span style={styles.metaLabel}>Timezone</span>
          <span style={styles.metaValue}>{Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
        </div>
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px', padding: '40px 20px' },
  clockCard: { 
    background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', 
    borderRadius: '32px', padding: '48px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', 
    gap: '24px', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' 
  },
  timeArea: { display: 'flex', alignItems: 'center', gap: '12px' },
  mainTime: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '72px', fontWeight: '900', color: '#fff', letterSpacing: '-2px' },
  segment: { fontFamily: 'monospace' },
  separator: { color: 'var(--color-accent)', opacity: 0.8 },
  ampm: { fontSize: '18px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginTop: '12px' },
  dateArea: { textAlign: 'center' },
  day: { fontSize: '24px', fontWeight: '800', color: 'var(--color-accent)' },
  fullDate: { fontSize: '14px', color: 'var(--color-text-muted)', marginTop: '4px', letterSpacing: '1px' },
  controls: { display: 'flex', gap: '12px' },
  toggle: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '20px', padding: '10px 24px', color: 'var(--color-text-muted)', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' },
  toggleActive: { background: 'var(--color-accent)', color: '#fff', borderColor: 'var(--color-accent)' },
  meta: { background: 'var(--color-bg-elevated)', padding: '12px 24px', borderRadius: '16px', display: 'flex', gap: '12px', alignItems: 'center' },
  metaLabel: { fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase' },
  metaValue: { fontSize: '13px', color: '#fff', fontWeight: 'bold' }
};
