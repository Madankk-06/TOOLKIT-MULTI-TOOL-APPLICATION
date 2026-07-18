import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import ToolWrapper from '../../components/ToolWrapper';
import { motion, AnimatePresence } from 'framer-motion';

const ISO_CLEANER: Record<string, string> = {
  'dollar': 'USD', 'dollars': 'USD', 'usd': 'USD', 'buck': 'USD', 'bucks': 'USD', '$': 'USD',
  'rupee': 'INR', 'rupees': 'INR', 'inr': 'INR', 'rs': 'INR', '₹': 'INR',
  'euro': 'EUR', 'euros': 'EUR', 'eur': 'EUR', '€': 'EUR',
  'pound': 'GBP', 'pounds': 'GBP', 'gbp': 'GBP', 'quid': 'GBP', '£': 'GBP',
  'yen': 'JPY', 'jpy': 'JPY', '¥': 'JPY',
  'dirham': 'AED', 'dirhams': 'AED', 'aed': 'AED'
};

const MAJOR_CURRENCIES = ['USD', 'INR', 'EUR', 'GBP', 'JPY', 'AED', 'AUD', 'CAD', 'SGD', 'CHF', 'CNY'];

export default function CurrencyConverter(props?: any) {
  const location = useLocation();
  const [amount, setAmount] = useState(1);
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('INR');
  const [rates, setRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let payload = null;
        if (props && (props.params || props.aiPayload)) {
          payload = props.params || props.aiPayload;
        } else if (location.state && (location.state.aiPayload || location.state.params)) {
          payload = location.state.aiPayload || location.state.params;
        } else if (props && Object.keys(props).some(k => k !== 'standalone')) {
          payload = props;
        }
    if (payload) {
      if (payload.amount) setAmount(Number(payload.amount));
      
      const fromVal = payload.fromCurrency || payload.from;
      if (fromVal) {
        const fromStr = String(fromVal).trim();
        if (ISO_CLEANER[fromStr.toLowerCase()]) {
          setFrom(ISO_CLEANER[fromStr.toLowerCase()]);
        } else if (fromStr.length === 3) {
          setFrom(fromStr.toUpperCase());
        }
      }
      
      const toVal = payload.toCurrency || payload.to;
      if (toVal) {
        const toStr = String(toVal).trim();
        if (ISO_CLEANER[toStr.toLowerCase()]) {
          setTo(ISO_CLEANER[toStr.toLowerCase()]);
        } else if (toStr.length === 3) {
          setTo(toStr.toUpperCase());
        }
      }
    }
  }, [location.state]);

  useEffect(() => {
    setLoading(true);
    fetch(`https://open.er-api.com/v6/latest/${from}`)
      .then(res => res.json())
      .then(data => {
        setRates(data.rates);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to fetch live rates. Check your connection.");
        setLoading(false);
      });
  }, [from]);

  const currencyOptions = useMemo(() => {
    const base = new Set([...MAJOR_CURRENCIES, from, to]);
    if (rates && Object.keys(rates).length > 0) {
      Object.keys(rates).forEach(c => base.add(c));
    }
    return Array.from(base).sort();
  }, [rates, from, to]);

  const converted = rates[to] ? (amount * rates[to]) : 0;

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  return (
    <ToolWrapper toolName="Currency Converter">
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.field}>
            <label style={styles.label}>Amount</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              style={styles.input}
              min="0"
            />
          </div>

          <div style={styles.selectorRow}>
            <div style={styles.field}>
              <label style={styles.label}>From</label>
              <select value={from} onChange={e => setFrom(e.target.value)} style={styles.select}>
                {currencyOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <motion.button 
              onClick={swap} 
              style={styles.swapBtn} 
              whileHover={{ rotate: 180 }}
              whileTap={{ scale: 0.9 }}
            >
              ⇄
            </motion.button>

            <div style={styles.field}>
              <label style={styles.label}>To</label>
              <select value={to} onChange={e => setTo(e.target.value)} style={styles.select}>
                {currencyOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div style={styles.resultCard}>
          {loading ? (
            <div style={styles.loading}>Syncing live rates...</div>
          ) : (
            <>
              <div style={styles.resultLabel}>Calculated Amount</div>
              <div style={styles.resultValue}>
                {converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span style={styles.resultSymbol}> {to}</span>
              </div>
              <div style={styles.rateInfo}>
                1 {from} = {rates[to]?.toFixed(4)} {to}
              </div>
            </>
          )}
        </div>

        {error && <div style={styles.error}>{error}</div>}
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '440px', margin: '0 auto', padding: '20px' },
  card: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' },
  field: { display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 },
  label: { fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' },
  input: {
    background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '12px',
    color: '#fff', fontSize: '24px', fontWeight: 'bold', padding: '14px', outline: 'none'
  },
  selectorRow: { display: 'flex', alignItems: 'flex-end', gap: '12px' },
  select: {
    background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '10px',
    color: 'var(--color-accent)', fontSize: '14px', fontWeight: 'bold', padding: '12px', outline: 'none', cursor: 'pointer'
  },
  swapBtn: {
    width: '44px', height: '44px', borderRadius: '50%', background: 'var(--color-bg-elevated)',
    border: '1px solid var(--color-border)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px'
  },
  resultCard: {
    background: 'linear-gradient(135deg, var(--color-bg-surface), #1a1a2e)', border: '1px solid var(--color-border)',
    borderRadius: '20px', padding: '32px', textAlign: 'center', boxShadow: '0 12px 40px rgba(0,0,0,0.3)'
  },
  resultLabel: { fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '8px' },
  resultValue: { fontSize: '42px', fontWeight: '900', color: 'var(--color-accent)', wordBreak: 'break-all' },
  resultSymbol: { fontSize: '18px', color: '#fff', opacity: 0.8 },
  rateInfo: { marginTop: '12px', fontSize: '14px', color: 'var(--color-text-muted)', fontFamily: 'monospace' },
  loading: { fontSize: '14px', color: 'var(--color-accent)', fontWeight: 'bold', letterSpacing: '1px' },
  error: { color: '#EF4444', background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '12px', fontSize: '13px', textAlign: 'center' }
};
