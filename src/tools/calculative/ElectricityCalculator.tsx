import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';

type Result = {
  kwh: number;
  cost: number;
};

const APPLIANCES = [
  { name: 'AC (1.5T)', watts: 1500, duty: 0.6 },
  { name: 'Fridge', watts: 150, duty: 0.4 },
  { name: 'LED TV', watts: 100, duty: 1 },
  { name: 'Washing M/c', watts: 500, duty: 1 },
  { name: 'Laptop', watts: 65, duty: 1 },
  { name: 'Heater', watts: 2000, duty: 1 },
  { name: 'Iron', watts: 1000, duty: 1 },
  { name: 'Bulb', watts: 12, duty: 1 }
];

export default function ElectricityCalculator(props?: any) {
  const location = useLocation();
  const [watts, setWatts] = useState('');
  const [hours, setHours] = useState('');
  const [rate, setRate] = useState('0.15');
  const [duty, setDuty] = useState('100');
  const [result, setResult] = useState<{ day: Result, month: Result, year: Result } | null>(null);

  const calculate = useCallback((wVal?: string, hVal?: string, rVal?: string) => {
    const w = parseFloat(wVal !== undefined ? wVal : watts);
    const h = parseFloat(hVal !== undefined ? hVal : hours);
    const r = parseFloat(rVal !== undefined ? rVal : rate);
    const dPct = parseFloat(duty) / 100;

    if (!w || !h || !r) return;

    const dailyKwh = (w * h * dPct) / 1000;
    const dailyCost = dailyKwh * r;

    setResult({
      day: { kwh: dailyKwh, cost: dailyCost },
      month: { kwh: dailyKwh * 30, cost: dailyCost * 30 },
      year: { kwh: dailyKwh * 365, cost: dailyCost * 365 }
    });
  }, [watts, hours, rate, duty]);

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
      const w = data.watts || '';
      const h = data.hours || '';
      const r = data.rate || '';
      const d = data.device || '';

      let finalWatts = w;
      if (d) {
        const found = APPLIANCES.find(a => a.name.toLowerCase().includes(String(d).toLowerCase()));
        if (found) {
          setWatts(String(found.watts));
          setDuty(String(found.duty * 100));
          if (!finalWatts) {
            finalWatts = String(found.watts);
          }
        }
      }
      
      if (w) setWatts(String(w));
      if (h) setHours(String(h));
      if (r) setRate(String(r));

      const finalHours = h || '';
      const finalRate = r || rate || '0.15';
      
      if (finalWatts && finalHours) {
        calculate(String(finalWatts), String(finalHours), String(finalRate));
      }
    }
  }, [location.state]);

  const selectAppliance = (app: typeof APPLIANCES[0]) => {
    setWatts(String(app.watts));
    setDuty(String(app.duty * 100));
  };

  return (
    <ToolWrapper toolName="Electricity Calculator">
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.appliancePanel}>
            <div style={styles.label}>Quick Presets</div>
            <div style={styles.chips}>
              {APPLIANCES.map(a => (
                <button key={a.name} onClick={() => selectAppliance(a)} style={styles.chip}>{a.name}</button>
              ))}
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Power Consumption (Watts)</label>
            <input type="number" value={watts} onChange={e => setWatts(e.target.value)} placeholder="1500" style={styles.input} />
          </div>

          <div style={styles.row}>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>Usage Hours/Day</label>
              <input type="number" value={hours} onChange={e => setHours(e.target.value)} placeholder="8" style={styles.input} />
            </div>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>Duty Cycle (%)</label>
              <input type="number" value={duty} onChange={e => setDuty(e.target.value)} placeholder="100" style={styles.input} />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Electric Rate (per kWh)</label>
            <input type="number" value={rate} onChange={e => setRate(e.target.value)} placeholder="0.15" style={styles.input} />
          </div>

          <motion.button onClick={() => calculate()} style={styles.calcBtn} whileTap={{ scale: 0.97 }}>
            Calculate Consumption
          </motion.button>
        </div>

        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={styles.resultBox}>
              {[
                { label: 'Daily', data: result.day },
                { label: 'Monthly', data: result.month },
                { label: 'Annual', data: result.year },
              ].map(item => (
                <div key={item.label} style={styles.resItem}>
                  <div style={styles.resInfo}>
                    <div style={styles.resLabel}>{item.label}</div>
                    <div style={styles.resKwh}>{item.data.kwh.toFixed(2)} kWh</div>
                  </div>
                  <div style={styles.resCost}>${item.data.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
              ))}
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
  appliancePanel: { display: 'flex', flexDirection: 'column', gap: '8px' },
  chips: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  chip: { background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '10px', color: 'var(--color-text-muted)', fontSize: '11px', fontWeight: 'bold', padding: '6px 12px', cursor: 'pointer' },
  row: { display: 'flex', gap: '12px' },
  field: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase' },
  input: { background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '12px', color: '#fff', fontSize: '16px', padding: '12px', outline: 'none' },
  calcBtn: { background: 'var(--color-accent)', border: 'none', borderRadius: '14px', color: '#fff', fontWeight: 'bold', padding: '16px', cursor: 'pointer' },
  resultBox: { display: 'flex', flexDirection: 'column', gap: '12px' },
  resItem: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '18px', padding: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  resInfo: { display: 'flex', flexDirection: 'column', gap: '4px' },
  resLabel: { fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'uppercase' },
  resKwh: { fontSize: '14px', color: '#fff', fontWeight: 'bold' },
  resCost: { fontSize: '24px', fontWeight: '900', color: 'var(--color-accent)' }
};
