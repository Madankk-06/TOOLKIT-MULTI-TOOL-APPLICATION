import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';

type UnitCategory = {
  units: string[];
  toBase: Record<string, number>;
  fromBase?: (val: number, to: string) => number;
  toBaseFunc?: (val: number, from: string) => number;
};

const CATEGORIES: Record<string, UnitCategory> = {
  Length: {
    units: ['Meter', 'Kilometer', 'Mile', 'Yard', 'Foot', 'Inch', 'Centimeter', 'Millimeter', 'Nautical Mile'],
    toBase: { Meter: 1, Kilometer: 1000, Mile: 1609.34, Yard: 0.9144, Foot: 0.3048, Inch: 0.0254, Centimeter: 0.01, Millimeter: 0.001, 'Nautical Mile': 1852 },
  },
  Weight: {
    units: ['Kilogram', 'Gram', 'Milligram', 'Pound', 'Ounce', 'Ton', 'Stone'],
    toBase: { Kilogram: 1, Gram: 0.001, Milligram: 1e-6, Pound: 0.453592, Ounce: 0.0283495, Ton: 1000, Stone: 6.35029 },
  },
  Temp: {
    units: ['Celsius', 'Fahrenheit', 'Kelvin'],
    toBase: { Celsius: 1, Fahrenheit: 1, Kelvin: 1 }, // Dummy
    toBaseFunc: (val, from) => {
      if (from === 'Celsius') return val;
      if (from === 'Fahrenheit') return (val - 32) * 5/9;
      if (from === 'Kelvin') return val - 273.15;
      return val;
    },
    fromBase: (val, to) => {
      if (to === 'Celsius') return val;
      if (to === 'Fahrenheit') return (val * 9/5) + 32;
      if (to === 'Kelvin') return val + 273.15;
      return val;
    }
  },
  Volume: {
    units: ['Liter', 'Milliliter', 'Cubic Meter', 'Gallon (US)', 'Quart', 'Pint', 'Cup', 'Fluid Ounce'],
    toBase: { Liter: 1, Milliliter: 0.001, 'Cubic Meter': 1000, 'Gallon (US)': 3.78541, Quart: 0.946353, Pint: 0.473176, Cup: 0.236588, 'Fluid Ounce': 0.0295735 },
  },
  Speed: {
    units: ['m/s', 'km/h', 'mph', 'knot', 'ft/s'],
    toBase: { 'm/s': 1, 'km/h': 0.277778, mph: 0.44704, knot: 0.514444, 'ft/s': 0.3048 },
  },
  Data: {
    units: ['Byte', 'Kilobyte', 'Megabyte', 'Gigabyte', 'Terabyte', 'Bit', 'Kilobit', 'Megabit'],
    toBase: { Byte: 1, Kilobyte: 1024, Megabyte: 1048576, Gigabyte: 1073741824, Terabyte: 1099511627776, Bit: 0.125, Kilobit: 128, Megabit: 131072 },
  },
};

export default function UnitConverter(props?: any) {
  const location = useLocation();
  const [category, setCategory] = useState('Length');
  const [from, setFrom] = useState('Meter');
  const [to, setTo] = useState('Kilometer');
  const [value, setValue] = useState('1');

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
      if (data.value !== undefined) setValue(String(data.value));
      
      const fUnit = String(data.fromUnit || '').trim();
      const tUnit = String(data.toUnit || '').trim();

      if (fUnit || tUnit) {
        let matchedCat = '';
        let matchedFrom = '';
        let matchedTo = '';

        for (const [catName, catData] of Object.entries(CATEGORIES)) {
          const fromMatch = catData.units.find(u => u.toLowerCase() === fUnit.toLowerCase());
          const toMatch = catData.units.find(u => u.toLowerCase() === tUnit.toLowerCase());
          if (fromMatch || toMatch) {
            matchedCat = catName;
            if (fromMatch) matchedFrom = fromMatch;
            if (toMatch) matchedTo = toMatch;
          }
        }

        if (matchedCat) {
          setCategory(matchedCat);
          const newCatUnits = CATEGORIES[matchedCat].units;
          if (matchedFrom) setFrom(matchedFrom);
          else setFrom(newCatUnits[0]);

          if (matchedTo) setTo(matchedTo);
          else setTo(newCatUnits[1] || newCatUnits[0]);
        }
      }
    }
  }, [location.state]);

  const cat = CATEGORIES[category];
  const fromUnit = cat.units.includes(from) ? from : cat.units[0];
  const toUnit = cat.units.includes(to) ? to : cat.units[1] || cat.units[0];

  const getResult = (valStr: string, f: string, t: string) => {
    const v = parseFloat(valStr);
    if (isNaN(v)) return null;
    
    let baseValue = 0;
    if (cat.toBaseFunc) {
      baseValue = cat.toBaseFunc(v, f);
    } else {
      baseValue = v * cat.toBase[f];
    }

    let result = 0;
    if (cat.fromBase) {
      result = cat.fromBase(baseValue, t);
    } else {
      result = baseValue / cat.toBase[t];
    }
    
    return result;
  };

  const formatResult = (res: number | null) => {
    if (res === null) return '—';
    if (Math.abs(res) < 0.000001) return res.toExponential(4);
    return Number(res.toPrecision(10)).toString();
  };

  const result = getResult(value, fromUnit, toUnit);
  const formatted = formatResult(result);

  const swap = () => {
    setFrom(toUnit);
    setTo(fromUnit);
  };

  return (
    <ToolWrapper toolName="Unit Converter">
      <div style={styles.container}>
        <div style={styles.catScroll}>
          {Object.keys(CATEGORIES).map(c => (
            <button 
              key={c} 
              onClick={() => { 
                setCategory(c); 
                setFrom(CATEGORIES[c].units[0]); 
                setTo(CATEGORIES[c].units[1] || CATEGORIES[c].units[0]); 
              }} 
              style={{
                ...styles.catBtn,
                ...(category === c ? styles.catActive : {}),
              }}
            >
              {c}
            </button>
          ))}
        </div>

        <div style={styles.card}>
          <div style={styles.inputRow}>
            <div style={styles.field}>
              <label style={styles.label}>From</label>
              <select value={fromUnit} onChange={e => setFrom(e.target.value)} style={styles.select}>
                {cat.units.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <input 
                type="number" 
                value={value} 
                onChange={e => setValue(e.target.value)} 
                style={styles.input} 
                placeholder="0"
              />
            </div>

            <button onClick={swap} style={styles.swapBtn}>⇄</button>

            <div style={styles.field}>
              <label style={styles.label}>To</label>
              <select value={toUnit} onChange={e => setTo(e.target.value)} style={styles.select}>
                {cat.units.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <div style={styles.resultBox}>
                {formatted}
              </div>
            </div>
          </div>

          <div style={styles.summary}>
            {value} {fromUnit} = <span style={{ color: 'var(--color-accent)' }}>{formatted} {toUnit}</span>
          </div>
        </div>

        <div style={styles.list}>
          <div style={styles.listHeader}>All Conversions</div>
          {cat.units.map(u => {
            const res = getResult(value, fromUnit, u);
            return (
              <div key={u} style={{ ...styles.listItem, background: u === toUnit ? 'rgba(108,99,255,0.1)' : 'transparent' }}>
                <span style={styles.unitName}>{u}</span>
                <span style={styles.unitVal}>{formatResult(res)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px' },
  catScroll: { display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none' },
  catBtn: {
    padding: '8px 16px', borderRadius: '20px', background: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border)', color: 'var(--color-text-muted)',
    fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap'
  },
  catActive: { background: 'var(--color-accent)', color: '#fff', borderColor: 'var(--color-accent)' },
  card: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '20px' },
  inputRow: { display: 'flex', flexDirection: 'column', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '1px' },
  select: {
    background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '8px',
    color: '#fff', padding: '10px', fontSize: '14px', outline: 'none'
  },
  input: {
    background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '8px',
    color: '#fff', padding: '12px', fontSize: '20px', fontWeight: 'bold', outline: 'none'
  },
  resultBox: {
    background: 'rgba(108,99,255,0.05)', border: '1px dashed var(--color-accent)', borderRadius: '8px',
    padding: '12px', fontSize: '20px', fontWeight: 'bold', color: 'var(--color-accent)', minHeight: '52px',
    display: 'flex', alignItems: 'center'
  },
  swapBtn: {
    alignSelf: 'center', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
    borderRadius: '50%', width: '40px', height: '40px', color: '#fff', cursor: 'pointer'
  },
  summary: { marginTop: '16px', textAlign: 'center', fontSize: '14px', color: 'var(--color-text-muted)', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' },
  list: { display: 'flex', flexDirection: 'column', gap: '4px' },
  listHeader: { fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-muted)', marginBottom: '4px' },
  listItem: { display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderRadius: '8px', fontSize: '13px' },
  unitName: { color: 'var(--color-text-muted)' },
  unitVal: { fontWeight: 'bold', color: '#fff' }
};
