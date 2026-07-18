import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { LineChart as ReLineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';
import { useTheme } from '../../context/ThemeContext';

type DataPoint = {
  label: string;
  value: string;
};

export default function LineChart(props?: any) {
  const { tokens } = useTheme();
  const [rows, setRows] = useState<DataPoint[]>([
    { label: 'Jan', value: '45' },
    { label: 'Feb', value: '52' },
    { label: 'Mar', value: '48' },
    { label: 'Apr', value: '70' },
    { label: 'May', value: '61' },
  ]);
  const [title, setTitle] = useState('Revenue Growth');
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
    if (data) {
      if (data.title) setTitle(String(data.title));
      
      let labelsList: string[] = [];
      let valuesList: string[] = [];
      
      if (Array.isArray(data.labels)) {
        labelsList = data.labels.map(String);
      } else if (typeof data.labels === 'string') {
        labelsList = data.labels.split(',').map((s: string) => s.trim());
      }
      
      if (Array.isArray(data.values)) {
        valuesList = data.values.map(String);
      } else if (typeof data.values === 'string') {
        valuesList = data.values.split(',').map((s: string) => s.trim());
      }
      
      if (labelsList.length > 0 && valuesList.length > 0) {
        const size = Math.min(labelsList.length, valuesList.length);
        const newRows = [];
        for (let i = 0; i < size; i++) {
          newRows.push({ label: labelsList[i], value: valuesList[i] });
        }
        setRows(newRows);
      } else if (valuesList.length > 0) {
        // If only values are provided, auto-generate labels
        const newRows = valuesList.map((v, idx) => ({
          label: `Point ${idx + 1}`,
          value: v
        }));
        setRows(newRows);
      }
    }
  }, [location.state]);

  const addRow = () => setRows([...rows, { label: `Point ${rows.length + 1}`, value: '0' }]);
  
  const updateRow = (index: number, field: keyof DataPoint, val: string) => {
    const updated = [...rows];
    updated[index][field] = val;
    setRows(updated);
  };

  const removeRow = (index: number) => {
    if (rows.length > 2) {
      setRows(rows.filter((_, i) => i !== index));
    }
  };

  const chartData = rows.map(r => ({
    name: r.label,
    value: parseFloat(r.value) || 0
  }));

  return (
    <ToolWrapper toolName="Line Chart">
      <div style={styles.container}>
        <div style={{ ...styles.editor, background: tokens.surface, borderColor: tokens.border }}>
          <input 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            placeholder="Chart Title" 
            style={{ ...styles.titleInput, color: tokens.accent, borderBottomColor: tokens.border }} 
          />
          
          <div style={styles.rowsList}>
            {rows.map((row, i) => (
              <div key={i} style={styles.row}>
                <input 
                  value={row.label} 
                  onChange={e => updateRow(i, 'label', e.target.value)} 
                  style={{ ...styles.input, flex: 2, background: tokens.inputBg, color: tokens.textPrimary, borderColor: tokens.border }} 
                />
                <input 
                  type="number" 
                  value={row.value} 
                  onChange={e => updateRow(i, 'value', e.target.value)} 
                  style={{ ...styles.input, flex: 1, background: tokens.inputBg, color: tokens.textPrimary, borderColor: tokens.border }} 
                />
                <button onClick={() => removeRow(i)} style={styles.deleteBtn}>×</button>
              </div>
            ))}
          </div>

          <button onClick={addRow} style={{ ...styles.addBtn, background: tokens.inputBg, borderColor: tokens.border, color: tokens.textSecondary }}>+ Add Data Point</button>
        </div>

        <div style={{ ...styles.viewer, background: tokens.surface, borderColor: tokens.border }}>
          <div style={{ ...styles.viewerHeader, color: tokens.textSecondary }}>{title}</div>
          <div style={{ height: '300px', width: '100%', marginTop: '12px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="lineColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={tokens.accent} stopOpacity={0.4}/>
                    <stop offset="95%" stopColor={tokens.accent} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={tokens.background === '#ffffff' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'} vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke={tokens.textSecondary} 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false}
                />
                <YAxis 
                  stroke={tokens.textSecondary} 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={v => v.toLocaleString()}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: tokens.surface, 
                    border: '1px solid ' + tokens.border, 
                    borderRadius: '12px', 
                    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                    color: tokens.textPrimary
                  }}
                  itemStyle={{ color: tokens.accent, fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke={tokens.accent} 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#lineColor)" 
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '640px', margin: '0 auto', padding: '10px' },
  editor: { border: '1px solid', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' },
  titleInput: { background: 'transparent', border: 'none', borderBottom: '1px solid', fontSize: '20px', fontWeight: '900', padding: '8px 0', outline: 'none', marginBottom: '8px', textAlign: 'center' },
  rowsList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  row: { display: 'flex', gap: '10px', alignItems: 'center' },
  input: { border: '1px solid', borderRadius: '10px', fontSize: '14px', padding: '10px 14px', outline: 'none' },
  deleteBtn: { width: '32px', height: '32px', background: 'rgba(239, 68, 68, 0.1)', border: 'none', borderRadius: '8px', color: '#EF4444', fontSize: '18px', cursor: 'pointer' },
  addBtn: { border: '1px dashed', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', padding: '12px', cursor: 'pointer' },
  viewer: { border: '1px solid', borderRadius: '24px', padding: '24px' },
  viewerHeader: { fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px', textAlign: 'center' }
};
