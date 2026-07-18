import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';

type AgeResult = {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  totalWeeks: number;
  totalHours: number;
  nextBirthdayDays: number;
  zodiac: string;
};

const ZODIAC_SIGNS = [
  { name: 'Capricorn', month: 0, day: 20 },
  { name: 'Aquarius', month: 1, day: 19 },
  { name: 'Pisces', month: 2, day: 20 },
  { name: 'Aries', month: 3, day: 20 },
  { name: 'Taurus', month: 4, day: 21 },
  { name: 'Gemini', month: 5, day: 21 },
  { name: 'Cancer', month: 6, day: 22 },
  { name: 'Leo', month: 7, day: 23 },
  { name: 'Virgo', month: 8, day: 23 },
  { name: 'Libra', month: 9, day: 23 },
  { name: 'Scorpio', month: 10, day: 22 },
  { name: 'Sagittarius', month: 11, day: 22 },
  { name: 'Capricorn', month: 11, day: 31 },
];

export default function AgeCalculator(props?: any) {
  const location = useLocation();
  const [dob, setDob] = useState('');
  const [result, setResult] = useState<AgeResult | null>(null);

  const getZodiac = (date: Date) => {
    const month = date.getMonth();
    const day = date.getDate();
    const sign = ZODIAC_SIGNS.find(s => (month < s.month) || (month === s.month && day <= s.day));
    return sign ? sign.name : 'Capricorn';
  };

  const calculate = useCallback((dobVal?: string) => {
    const dVal = dobVal !== undefined ? dobVal : dob;
    if (!dVal) return;
    const birth = new Date(dVal);
    const now = new Date();
    if (birth > now) return;

    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    let days = now.getDate() - birth.getDate();

    if (days < 0) {
      months--;
      days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    const diff = now.getTime() - birth.getTime();
    const totalDays = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    // Next birthday
    const nextBday = new Date(birth);
    nextBday.setFullYear(now.getFullYear());
    if (nextBday < now) nextBday.setFullYear(now.getFullYear() + 1);
    const nextBirthdayDays = Math.ceil((nextBday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    setResult({
      years, months, days,
      totalDays,
      totalWeeks: Math.floor(totalDays / 7),
      totalHours: totalDays * 24,
      nextBirthdayDays,
      zodiac: getZodiac(birth)
    });
  }, [dob]);

  useEffect(() => {
    let data = null;
        if (props && (props.params || props.aiPayload)) {
          data = props.params || props.aiPayload;
        } else if (location.state && (location.state.aiPayload || location.state.params)) {
          data = location.state.aiPayload || location.state.params;
        } else if (props && Object.keys(props).some(k => k !== 'standalone')) {
          data = props;
        }
    if (data && data.dob) {
      setDob(String(data.dob));
      calculate(String(data.dob));
    }
  }, [location.state, calculate]);

  return (
    <ToolWrapper toolName="Age Calculator">
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.field}>
            <label style={styles.label}>Select Birthday</label>
            <input 
              type="date" value={dob} onChange={e => setDob(e.target.value)} 
              max={new Date().toISOString().split('T')[0]}
              style={styles.input} 
            />
          </div>
          <motion.button 
            onClick={() => calculate()} style={styles.calcBtn}
            whileTap={{ scale: 0.97 }}
          >
            Discover Your Age
          </motion.button>
        </div>

        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={styles.resultBox}>
              <div style={styles.mainDisplay}>
                <div style={styles.bigAge}>
                  <div style={styles.ageItem}>
                    <span style={styles.ageNum}>{result.years}</span>
                    <span style={styles.ageUnit}>Years</span>
                  </div>
                  <div style={styles.ageItem}>
                    <span style={styles.ageNum}>{result.months}</span>
                    <span style={styles.ageUnit}>Months</span>
                  </div>
                  <div style={styles.ageItem}>
                    <span style={styles.ageNum}>{result.days}</span>
                    <span style={styles.ageUnit}>Days</span>
                  </div>
                </div>
              </div>

              <div style={styles.grid}>
                {[
                  { label: 'Total Days', val: result.totalDays.toLocaleString() },
                  { label: 'Total Weeks', val: result.totalWeeks.toLocaleString() },
                  { label: 'Total Hours', val: result.totalHours.toLocaleString() },
                  { label: 'Zodiac Sign', val: result.zodiac }
                ].map(s => (
                  <div key={s.label} style={styles.statBox}>
                    <div style={styles.statLabel}>{s.label}</div>
                    <div style={styles.statVal}>{s.val}</div>
                  </div>
                ))}
              </div>

              <div style={styles.nextBox}>
                🎂 Next birthday in <span style={styles.highlight}>{result.nextBirthdayDays}</span> days
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '440px', margin: '0 auto', padding: '20px' },
  card: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' },
  field: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase' },
  input: { background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '12px', color: '#fff', fontSize: '16px', padding: '14px', outline: 'none', colorScheme: 'dark' },
  calcBtn: { background: 'var(--color-accent)', border: 'none', borderRadius: '14px', color: '#fff', fontWeight: 'bold', padding: '16px', cursor: 'pointer' },
  resultBox: { display: 'flex', flexDirection: 'column', gap: '16px' },
  mainDisplay: { background: 'linear-gradient(135deg, var(--color-bg-elevated), var(--color-bg-surface))', border: '1px solid var(--color-accent)', borderRadius: '24px', padding: '32px' },
  bigAge: { display: 'flex', justifyContent: 'space-around', alignItems: 'center' },
  ageItem: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  ageNum: { fontSize: '42px', fontWeight: '900', color: 'var(--color-accent)' },
  ageUnit: { fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  statBox: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '16px' },
  statLabel: { fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' },
  statVal: { fontSize: '18px', fontWeight: 'bold', color: '#fff' },
  nextBox: { background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '16px', padding: '16px', textAlign: 'center', fontSize: '14px', color: 'var(--color-text-primary)' },
  highlight: { color: 'var(--color-accent)', fontWeight: 'bold' }
};
