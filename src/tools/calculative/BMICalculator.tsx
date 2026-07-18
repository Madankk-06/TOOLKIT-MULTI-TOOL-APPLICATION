import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';

type Category = {
  label: string;
  range: [number, number];
  color: string;
};

const CATEGORIES: Category[] = [
  { label: 'Underweight', range: [0, 18.5], color: '#38B6FF' },
  { label: 'Normal', range: [18.5, 25], color: '#22C55E' },
  { label: 'Overweight', range: [25, 30], color: '#F59E0B' },
  { label: 'Obese', range: [30, 100], color: '#EF4444' },
];

function getCategory(bmi: number) {
  return CATEGORIES.find(c => bmi >= c.range[0] && bmi < c.range[1]) || CATEGORIES[3];
}

export default function BMICalculator(props?: any) {
  const location = useLocation();
  const [unit, setUnit] = useState<'metric' | 'imperial'>('metric');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [result, setResult] = useState<number | null>(null);

  const calculate = useCallback((w: string, h: string, hFt: string, hIn: string, u: 'metric' | 'imperial') => {
    let weightVal = parseFloat(w);
    let heightVal = 0;

    if (u === 'metric') {
      heightVal = parseFloat(h) / 100;
    } else {
      const ft = parseFloat(hFt) || 0;
      const inch = parseFloat(hIn) || 0;
      heightVal = (ft * 12 + inch) * 0.0254;
      weightVal = weightVal * 0.453592;
    }

    if (!weightVal || !heightVal || heightVal === 0) return;
    const bmi = +(weightVal / (heightVal * heightVal)).toFixed(1);
    setResult(bmi);
  }, []);

  useEffect(() => {
    let data = null;
        if (props && (props.params || props.aiPayload)) {
          data = props.params || props.aiPayload;
        } else if (location.state && (location.state.aiPayload || location.state.params)) {
          data = location.state.aiPayload || location.state.params;
        } else if (props && Object.keys(props).some(k => k !== 'standalone')) {
          data = props;
        }
    if (data) {
      const targetUnit = data.unit === 'imperial' || data.weight_lbs ? 'imperial' : 'metric';
      setUnit(targetUnit);
      
      const w = data.weight || data.weight_lbs || data.weight_kg || '';
      setWeight(String(w));

      let heightFtVal = '';
      let heightInVal = '';
      let heightCmVal = '';

      if (data.height) {
        const hVal = Number(data.height);
        if (targetUnit === 'metric') {
          if (hVal < 3) {
            heightCmVal = String(Math.round(hVal * 100));
          } else {
            heightCmVal = String(hVal);
          }
        } else {
          if (hVal < 10) {
            const totalInches = hVal * 12;
            heightFtVal = String(Math.floor(hVal));
            heightInVal = String(Math.round(totalInches % 12));
          } else {
            heightFtVal = String(Math.floor(hVal / 12));
            heightInVal = String(Math.round(hVal % 12));
          }
        }
      }

      if (targetUnit === 'metric') {
        const h = data.height_cm || heightCmVal || data.height || '';
        setHeight(String(h));
        if (w && h) calculate(String(w), String(h), '', '', 'metric');
      } else {
        const ft = data.height_ft || heightFtVal || '';
        const inch = data.height_in !== undefined && data.height_in !== null ? String(data.height_in) : (heightInVal || '0');
        setHeightFt(String(ft));
        setHeightIn(String(inch));
        if (w && ft) calculate(String(w), '', String(ft), String(inch), 'imperial');
      }
    }
  }, [location.state, calculate]);

  const cat = result ? getCategory(result) : null;
  const angle = result ? Math.min(90, Math.max(-90, ((result - 10) / 35) * 180 - 90)) : -90;

  return (
    <ToolWrapper toolName="BMI Calculator">
      <div style={styles.container}>
        <div style={styles.unitToggle}>
          <button 
            onClick={() => setUnit('metric')} 
            style={{ ...styles.toggleBtn, ...(unit === 'metric' ? styles.toggleActive : {}) }}
          >
            Metric
          </button>
          <button 
            onClick={() => setUnit('imperial')} 
            style={{ ...styles.toggleBtn, ...(unit === 'imperial' ? styles.toggleActive : {}) }}
          >
            Imperial
          </button>
        </div>

        <div style={styles.card}>
          <div style={styles.inputSection}>
            <div style={styles.field}>
              <label style={styles.label}>Weight ({unit === 'metric' ? 'kg' : 'lbs'})</label>
              <input 
                type="number" value={weight} onChange={e => setWeight(e.target.value)}
                placeholder={unit === 'metric' ? '70' : '154'} style={styles.input}
              />
            </div>

            {unit === 'metric' ? (
              <div style={styles.field}>
                <label style={styles.label}>Height (cm)</label>
                <input 
                  type="number" value={height} onChange={e => setHeight(e.target.value)}
                  placeholder="175" style={styles.input}
                />
              </div>
            ) : (
              <div style={styles.field}>
                <label style={styles.label}>Height (ft/in)</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input type="number" value={heightFt} onChange={e => setHeightFt(e.target.value)} placeholder="5" style={{ ...styles.input, flex: 1 }} />
                  <input type="number" value={heightIn} onChange={e => setHeightIn(e.target.value)} placeholder="9" style={{ ...styles.input, flex: 1 }} />
                </div>
              </div>
            )}
          </div>

          <motion.button 
            onClick={() => calculate(weight, height, heightFt, heightIn, unit)}
            style={styles.calcBtn}
            whileTap={{ scale: 0.97 }}
          >
            Analyze BMI
          </motion.button>
        </div>

        <AnimatePresence>
          {result && cat && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} 
              style={styles.resultCard}
            >
              <div style={styles.gaugeBox}>
                <svg width="200" height="110" viewBox="0 0 200 110">
                  <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" strokeLinecap="round" />
                  <path d="M 20 100 A 80 80 0 0 1 60 30" fill="none" stroke="#38B6FF" strokeWidth="12" strokeLinecap="round" />
                  <path d="M 60 30 A 80 80 0 0 1 140 30" fill="none" stroke="#22C55E" strokeWidth="12" strokeLinecap="round" />
                  <path d="M 140 30 A 80 80 0 0 1 180 100" fill="none" stroke="#EF4444" strokeWidth="12" strokeLinecap="round" />
                  
                  <motion.line
                    x1="100" y1="100"
                    x2={100 + 70 * Math.cos((angle - 90) * Math.PI / 180)}
                    y2={100 + 70 * Math.sin((angle - 90) * Math.PI / 180)}
                    stroke="#fff" strokeWidth="4" strokeLinecap="round"
                    transition={{ type: 'spring', damping: 15 }}
                  />
                  <circle cx="100" cy="100" r="6" fill="#fff" />
                </svg>
              </div>

              <div style={styles.resultInfo}>
                <div style={{ ...styles.score, color: cat.color }}>{result}</div>
                <div style={{ ...styles.status, color: cat.color }}>{cat.label}</div>
              </div>

              <div style={styles.legend}>
                {CATEGORIES.map(c => (
                  <div key={c.label} style={styles.legendItem}>
                    <div style={{ ...styles.dot, background: c.color }} />
                    <span style={styles.legendLabel}>{c.label}</span>
                    <span style={styles.legendRange}>{c.range[0]}-{c.range[1] === 100 ? '40+' : c.range[1]}</span>
                  </div>
                ))}
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
  unitToggle: { display: 'flex', background: 'var(--color-bg-surface)', padding: '4px', borderRadius: '12px', border: '1px solid var(--color-border)' },
  toggleBtn: { flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', color: 'var(--color-text-muted)', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' },
  toggleActive: { background: 'var(--color-accent)', color: '#fff' },
  card: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' },
  inputSection: { display: 'flex', flexDirection: 'column', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase' },
  input: { background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '12px', color: '#fff', fontSize: '18px', padding: '14px', outline: 'none' },
  calcBtn: { background: 'linear-gradient(135deg, #6C63FF, #8B5CF6)', border: 'none', borderRadius: '14px', color: '#fff', fontWeight: 'bold', padding: '16px', cursor: 'pointer', fontSize: '16px' },
  resultCard: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' },
  gaugeBox: { marginBottom: '-10px' },
  resultInfo: { textAlign: 'center' },
  score: { fontSize: '48px', fontWeight: '900', lineHeight: 1 },
  status: { fontSize: '20px', fontWeight: 'bold', marginTop: '4px' },
  legend: { width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' },
  dot: { width: '10px', height: '10px', borderRadius: '50%' },
  legendLabel: { flex: 1, color: 'var(--color-text-primary)' },
  legendRange: { color: 'var(--color-text-muted)', fontFamily: 'monospace' }
};
