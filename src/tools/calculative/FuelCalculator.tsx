import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';

type Result = {
  liters: number;
  cost: number;
  perKm: number;
};

export default function FuelCalculator(props?: any) {
  const location = useLocation();
  const [distance, setDistance] = useState('');
  const [mileage, setMileage] = useState('');
  const [price, setPrice] = useState('');
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const calculate = useCallback((dVal?: string, mVal?: string, pVal?: string, roundTrip?: boolean) => {
    const isRt = roundTrip !== undefined ? roundTrip : isRoundTrip;
    const d = parseFloat(dVal !== undefined ? dVal : distance) * (isRt ? 2 : 1);
    const m = parseFloat(mVal !== undefined ? mVal : mileage);
    const p = parseFloat(pVal !== undefined ? pVal : price);
    
    if (!d || !m || !p) return;

    const liters = d / m;
    const cost = liters * p;
    setResult({
      liters: Number(liters.toFixed(2)),
      cost: Number(cost.toFixed(2)),
      perKm: Number((cost / d).toFixed(2))
    });
  }, [distance, mileage, price, isRoundTrip]);

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
      const d = data.distance || '';
      const m = data.fuelEfficiency || data.mileage || '';
      const p = data.fuelPrice || data.price || '';
      if (d) setDistance(String(d));
      if (m) setMileage(String(m));
      if (p) setPrice(String(p));
      if (d && m && p) {
        calculate(String(d), String(m), String(p));
      }
    }
  }, [location.state, calculate]);

  return (
    <ToolWrapper toolName="Fuel Calculator">
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.field}>
            <label style={styles.label}>Distance (km)</label>
            <input type="number" value={distance} onChange={e => setDistance(e.target.value)} placeholder="100" style={styles.input} />
          </div>

          <div style={styles.row}>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>Vehicle Efficiency (km/L)</label>
              <input type="number" value={mileage} onChange={e => setMileage(e.target.value)} placeholder="15" style={styles.input} />
            </div>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>Fuel Price (per L)</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="100" style={styles.input} />
            </div>
          </div>

          <div style={styles.toggleRow} onClick={() => setIsRoundTrip(!isRoundTrip)}>
            <div style={{ ...styles.checkbox, background: isRoundTrip ? 'var(--color-accent)' : 'transparent' }}>
              {isRoundTrip && '✓'}
            </div>
            <span style={styles.toggleLabel}>Round Trip (Distance × 2)</span>
          </div>

          <motion.button onClick={() => calculate()} style={styles.calcBtn} whileTap={{ scale: 0.97 }}>
            Estimate Trip Cost
          </motion.button>
        </div>

        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={styles.resultBox}>
              <div style={styles.mainStat}>
                <div style={styles.mainLabel}>Total Trip Cost</div>
                <div style={styles.mainVal}>${result.cost.toLocaleString()}</div>
              </div>

              <div style={styles.grid}>
                <div style={styles.statBox}>
                  <div style={styles.statLabel}>Fuel Required</div>
                  <div style={styles.statVal}>{result.liters} L</div>
                </div>
                <div style={styles.statBox}>
                  <div style={styles.statLabel}>Cost per km</div>
                  <div style={styles.statVal}>${result.perKm}</div>
                </div>
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
  row: { display: 'flex', gap: '12px' },
  field: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase' },
  input: { background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '12px', color: '#fff', fontSize: '16px', padding: '12px', outline: 'none' },
  toggleRow: { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '4px 0' },
  checkbox: { width: '18px', height: '18px', border: '2px solid var(--color-accent)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#fff', transition: 'all 0.2s' },
  toggleLabel: { fontSize: '13px', color: 'var(--color-text-primary)' },
  calcBtn: { background: 'var(--color-accent)', border: 'none', borderRadius: '14px', color: '#fff', fontWeight: 'bold', padding: '16px', cursor: 'pointer', marginTop: '4px' },
  resultBox: { display: 'flex', flexDirection: 'column', gap: '16px' },
  mainStat: { background: 'var(--color-bg-elevated)', border: '1px solid var(--color-accent)', borderRadius: '24px', padding: '24px', textAlign: 'center' },
  mainLabel: { fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '8px' },
  mainVal: { fontSize: '40px', fontWeight: '900', color: 'var(--color-accent)' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  statBox: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '16px', textAlign: 'center' },
  statLabel: { fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' },
  statVal: { fontSize: '18px', fontWeight: 'bold', color: '#fff' }
};
