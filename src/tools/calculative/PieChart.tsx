import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PieChart as RePieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';

type Slice = {
  label: string;
  value: string;
};

const COLORS = [
  '#6366F1', '#A855F7', '#EC4899', '#F43F5E', 
  '#F59E0B', '#10B981', '#06B6D4', '#3B82F6'
];

export default function PieChart(props?: any) {
  const [items, setItems] = useState<Slice[]>([
    { label: 'Work', value: '40' },
    { label: 'Study', value: '30' },
    { label: 'Leisure', value: '20' },
    { label: 'Sleep', value: '10' },
  ]);
  const [isDonut, setIsDonut] = useState(true);
  const [title, setTitle] = useState('Daily Allocation');
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
        const newItems = [];
        for (let i = 0; i < size; i++) {
          newItems.push({ label: labelsList[i], value: valuesList[i] });
        }
        setItems(newItems);
      } else if (valuesList.length > 0) {
        // If only values are provided, auto-generate labels
        const newItems = valuesList.map((v, idx) => ({
          label: `Slice ${idx + 1}`,
          value: v
        }));
        setItems(newItems);
      }
    }
  }, [location.state]);

  const addItem = () => setItems([...items, { label: `New Item`, value: '10' }]);
  
  const updateItem = (index: number, field: keyof Slice, val: string) => {
    const updated = [...items];
    updated[index][field] = val;
    setItems(updated);
  };

  const removeItem = (index: number) => {
    if (items.length > 2) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const chartData = items
    .map(it => ({ name: it.label || 'Unnamed', value: parseFloat(it.value) || 0 }))
    .filter(it => it.value > 0);

  return (
    <ToolWrapper toolName="Pie Chart">
      <div style={styles.container}>
        <div style={styles.editor}>
          <input 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            placeholder="Chart Title" 
            style={styles.titleInput} 
          />
          
          <div style={styles.list}>
            {items.map((it, i) => (
              <div key={i} style={styles.row}>
                <div style={{ ...styles.dot, background: COLORS[i % COLORS.length] }} />
                <input 
                  value={it.label} 
                  onChange={e => updateItem(i, 'label', e.target.value)} 
                  style={{ ...styles.input, flex: 2 }} 
                />
                <input 
                  type="number" 
                  value={it.value} 
                  onChange={e => updateItem(i, 'value', e.target.value)} 
                  style={{ ...styles.input, flex: 1 }} 
                />
                <button onClick={() => removeItem(i)} style={styles.delBtn}>×</button>
              </div>
            ))}
          </div>

          <button onClick={addItem} style={styles.addBtn}>+ Add Slice</button>
          
          <div style={styles.toggle} onClick={() => setIsDonut(!isDonut)}>
            <div style={{ ...styles.switch, background: isDonut ? 'var(--color-accent)' : 'var(--color-bg-elevated)' }}>
              <motion.div animate={{ x: isDonut ? 14 : 0 }} style={styles.knob} />
            </div>
            <span style={styles.toggleLabel}>Donut Mode</span>
          </div>
        </div>

        <div style={styles.viewer}>
          <div style={styles.viewerHeader}>{title}</div>
          <div style={{ height: '280px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={isDonut ? 60 : 0}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ background: 'var(--color-bg-elevated)', border: 'none', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff', fontSize: '12px' }}
                />
              </RePieChart>
            </ResponsiveContainer>
          </div>
          
          <div style={styles.legend}>
            {chartData.map((d, i) => (
              <div key={i} style={styles.legendItem}>
                <div style={{ ...styles.dotSmall, background: COLORS[i % COLORS.length] }} />
                <span style={styles.legendName}>{d.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '640px', margin: '0 auto', padding: '20px' },
  editor: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' },
  titleInput: { background: 'transparent', border: 'none', borderBottom: '1px solid var(--color-border)', color: 'var(--color-accent)', fontSize: '18px', fontWeight: 'bold', textAlign: 'center', padding: '8px', outline: 'none' },
  list: { display: 'flex', flexDirection: 'column', gap: '10px' },
  row: { display: 'flex', gap: '10px', alignItems: 'center' },
  dot: { width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0 },
  input: { background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '10px', color: '#fff', fontSize: '14px', padding: '10px' },
  delBtn: { width: '32px', height: '32px', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  addBtn: { background: 'var(--color-bg-elevated)', border: '1px dashed var(--color-border)', borderRadius: '12px', color: 'var(--color-text-muted)', fontSize: '12px', fontWeight: 'bold', padding: '12px', cursor: 'pointer' },
  toggle: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', cursor: 'pointer' },
  switch: { width: '34px', height: '20px', borderRadius: '10px', padding: '3px', transition: 'all 0.3s' },
  knob: { width: '14px', height: '14px', background: '#fff', borderRadius: '50%' },
  toggleLabel: { fontSize: '12px', color: 'var(--color-text-primary)' },
  viewer: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '24px', padding: '24px' },
  viewerHeader: { fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-muted)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '2px' },
  legend: { display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginTop: '16px' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '6px' },
  dotSmall: { width: '8px', height: '8px', borderRadius: '50%' },
  legendName: { fontSize: '11px', color: 'var(--color-text-muted)' }
};
