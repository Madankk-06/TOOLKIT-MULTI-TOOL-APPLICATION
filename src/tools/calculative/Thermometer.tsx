import React, { useState } from 'react';
import { motion } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';
import { useTheme } from '../../context/ThemeContext';
import SkeuomorphicToggle from '../../components/SkeuomorphicToggle';

const SCALES = ['°C', '°F', 'K', '°R'];

const convert = (value: number, from: string, to: string): number => {
  let celsius = 0;
  switch (from) {
    case '°C': celsius = value; break;
    case '°F': celsius = (value - 32) * 5 / 9; break;
    case 'K': celsius = value - 273.15; break;
    case '°R': celsius = (value - 491.67) * 5 / 9; break;
  }
  switch (to) {
    case '°C': return celsius;
    case '°F': return celsius * 9 / 5 + 32;
    case 'K': return celsius + 273.15;
    case '°R': return celsius * 9 / 5 + 491.67;
    default: return celsius;
  }
};

const REFS = [
  { label: 'Absolute Zero', temp: -273.15, unit: '°C' },
  { label: 'Water Freezes', temp: 0, unit: '°C' },
  { label: 'Body Temp', temp: 37, unit: '°C' },
  { label: 'Water Boils', temp: 100, unit: '°C' },
];

export default function Thermometer() {
  const [val, setVal] = useState('');
  const [unit, setUnit] = useState('°C');
  const { tokens } = useTheme();

  const numericVal = parseFloat(val) || 0;
  const celsius = convert(numericVal, unit, '°C');
  
  // Normalize for SVG (0°C to 100°C range for visual)
  const normHeight = Math.min(100, Math.max(0, (celsius / 100) * 100));

  return (
    <ToolWrapper toolName="Thermometer">
      <div style={styles.container}>
        <div style={styles.visualArea}>
          <div style={styles.thermometerFrame}>
            <div style={{ ...styles.glassTube, background: tokens.inputBg, borderColor: tokens.border }}>
              <motion.div 
                style={styles.mercury} 
                animate={{ height: `${normHeight}%` }}
                transition={{ type: 'spring', damping: 15 }}
              />
            </div>
            <div style={styles.bulb} />
          </div>

          <div style={styles.controls}>
            <div style={{ ...styles.inputGroup, alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: tokens.textSecondary, textTransform: 'uppercase' }}>
                  Scale
                </span>
                <SkeuomorphicToggle
                  checked={unit === '°F'}
                  onChange={(isF) => setUnit(isF ? '°F' : '°C')}
                  uncheckedLabel="C"
                  checkedLabel="F"
                  size={58}
                />
              </div>
              <input 
                type="number" value={val} onChange={e => setVal(e.target.value)} 
                placeholder="0" 
                style={{ ...styles.input, background: tokens.inputBg, color: tokens.textPrimary, borderColor: tokens.border, height: '58px' }} 
              />
            </div>

            <div style={styles.resultsGrid}>
              {SCALES.filter(s => s !== unit).map(s => (
                <div key={s} style={{ ...styles.resCard, background: tokens.surface, borderColor: tokens.border }}>
                  <div style={{ ...styles.resLabel, color: tokens.textSecondary }}>{s}</div>
                  <div style={{ ...styles.resVal, color: tokens.accent }}>{convert(numericVal, unit, s).toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ ...styles.refSection, background: tokens.surface, borderColor: tokens.border }}>
          <div style={{ ...styles.refHeader, color: tokens.textSecondary }}>Common Benchmarks</div>
          <div style={styles.refGrid}>
            {REFS.map(r => (
              <button 
                key={r.label} 
                onClick={() => { setVal(String(r.temp)); setUnit(r.unit); }} 
                style={{ ...styles.refBtn, background: tokens.inputBg, borderColor: tokens.border }}
              >
                <div style={{ ...styles.refName, color: tokens.textSecondary }}>{r.label}</div>
                <div style={{ ...styles.refTemp, color: tokens.textPrimary }}>{r.temp}{r.unit}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '480px', margin: '0 auto', padding: '10px' },
  visualArea: { display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' },
  thermometerFrame: { width: '40px', height: '240px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  glassTube: { width: '16px', height: '180px', borderRadius: '10px', position: 'relative', overflow: 'hidden', border: '1px solid' },
  mercury: { position: 'absolute', bottom: 0, width: '100%', background: 'linear-gradient(to top, #EF4444, #F43F5E)', borderRadius: '8px' },
  bulb: { width: '32px', height: '32px', background: '#EF4444', borderRadius: '50%', marginTop: '-12px', zIndex: 2, boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)' },
  controls: { flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '240px', width: '100%' },
  inputGroup: { display: 'flex', gap: '8px', width: '100%' },
  select: { border: '1px solid', borderRadius: '12px', padding: '12px', cursor: 'pointer', outline: 'none' },
  input: { flex: 1, border: '1px solid', borderRadius: '12px', fontSize: '20px', fontWeight: 'bold', padding: '12px', outline: 'none', width: '100%' },
  resultsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))', gap: '8px', width: '100%' },
  resCard: { border: '1px solid', borderRadius: '12px', padding: '12px 6px', textAlign: 'center', boxShadow: '0 4px 8px rgba(0,0,0,0.04)' },
  resLabel: { fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' },
  resVal: { fontSize: '14px', fontWeight: 'bold', marginTop: '4px', fontFamily: 'monospace' },
  refSection: { border: '1px solid', borderRadius: '24px', padding: '24px' },
  refHeader: { fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '16px', textAlign: 'center', letterSpacing: '1px' },
  refGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' },
  refBtn: { border: '1px solid', borderRadius: '14px', padding: '12px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' },
  refName: { fontSize: '11px' },
  refTemp: { fontSize: '14px', fontWeight: 'bold', marginTop: '2px', fontFamily: 'monospace' }
};
