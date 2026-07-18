import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';

type Goal = 'maintain' | 'lose' | 'gain';

export default function NutritionExpert(props?: any) {
  const location = useLocation();
  const [age, setAge] = useState(25);
  const [weight, setWeight] = useState(70);
  const [height, setHeight] = useState(175);
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [activity, setActivity] = useState(1.375);
  const [goal, setGoal] = useState<Goal>('maintain');

  useEffect(() => {
    const data = props?.params || props?.aiPayload || location.state?.aiPayload || location.state?.params;
    if (data) {
      if (data.age !== undefined) setAge(Math.min(80, Math.max(15, Number(data.age))));
      if (data.weight !== undefined) setWeight(Math.min(150, Math.max(40, Number(data.weight))));
      if (data.height !== undefined) setHeight(Math.min(230, Math.max(130, Number(data.height))));
      if (data.gender) {
        const g = String(data.gender).toLowerCase();
        if (g === 'male' || g === 'female') setGender(g);
      }
      if (data.goal) {
        const g = String(data.goal).toLowerCase();
        if (g === 'lose' || g === 'maintain' || g === 'gain') setGoal(g as Goal);
        else if (g.includes('loss') || g.includes('weight loss')) setGoal('lose');
        else if (g.includes('gain') || g.includes('bulk')) setGoal('gain');
      }
      if (data.activity !== undefined) {
        const actVal = Number(data.activity);
        const validActs = [1.2, 1.375, 1.55, 1.725, 1.9];
        const closest = validActs.reduce((a, b) => Math.abs(b - actVal) < Math.abs(a - actVal) ? b : a);
        setActivity(closest);
      }
    }
  }, [location.state]);

  const stats = useMemo(() => {
    // Mifflin-St Jeor Equation
    let bmr = (10 * weight) + (6.25 * height) - (5 * age);
    bmr = gender === 'male' ? bmr + 5 : bmr - 161;
    
    const tdee = Math.round(bmr * activity);
    let target = tdee;
    if (goal === 'lose') target -= 500;
    if (goal === 'gain') target += 500;

    const protein = weight * 2.2; // 1g per lb / ~2.2g per kg
    const fats = (target * 0.25) / 9;
    const carbs = (target - (protein * 4) - (fats * 9)) / 4;

    return { bmr, tdee, target, protein: Math.round(protein), fats: Math.round(fats), carbs: Math.round(carbs) };
  }, [age, weight, height, gender, activity, goal]);

  return (
    <ToolWrapper toolName="Nutrition Expert">
      <div style={styles.container}>
        <div style={styles.configArea}>
          <div style={styles.genderToggle}>
            <button 
              onClick={() => setGender('male')}
              style={{ ...styles.gBtn, ...(gender === 'male' ? styles.gActive : {}) }}
            >MALE</button>
            <button 
              onClick={() => setGender('female')}
              style={{ ...styles.gBtn, ...(gender === 'female' ? styles.gActive : {}) }}
            >FEMALE</button>
          </div>

          <div style={styles.params}>
            <div style={styles.param}>
              <div style={styles.row}><span style={styles.label}>Age</span><span style={styles.val}>{age}y</span></div>
              <input type="range" min="15" max="80" value={age} onChange={e => setAge(Number(e.target.value))} style={styles.slider} />
            </div>
            <div style={styles.param}>
              <div style={styles.row}><span style={styles.label}>Weight</span><span style={styles.val}>{weight}kg</span></div>
              <input type="range" min="40" max="150" value={weight} onChange={e => setWeight(Number(e.target.value))} style={styles.slider} />
            </div>
            <div style={styles.param}>
              <div style={styles.row}><span style={styles.label}>Height</span><span style={styles.val}>{height}cm</span></div>
              <input type="range" min="130" max="230" value={height} onChange={e => setHeight(Number(e.target.value))} style={styles.slider} />
            </div>
          </div>

          <div style={styles.selectBox}>
            <div style={styles.label}>Activity Level</div>
            <select value={activity} onChange={e => setActivity(Number(e.target.value))} style={styles.select}>
              <option value="1.2">Sedentary (No exercise)</option>
              <option value="1.375">Light (1-2 days/week)</option>
              <option value="1.55">Moderate (3-5 days/week)</option>
              <option value="1.725">Active (6-7 days/week)</option>
              <option value="1.9">Elite (Professional athlete)</option>
            </select>
          </div>
        </div>

        <div style={styles.resultsArea}>
          <div style={styles.goalTabs}>
            {(['lose', 'maintain', 'gain'] as Goal[]).map(g => (
              <button 
                key={g} 
                onClick={() => setGoal(g)}
                style={{ ...styles.goalTab, ...(goal === g ? styles.goalActive : {}) }}
              >
                {g.toUpperCase()}
              </button>
            ))}
          </div>

          <div style={styles.caloriesCard}>
            <div style={styles.calLabel}>Daily Target</div>
            <div style={styles.calValue}>{stats.target.toLocaleString()}</div>
            <div style={styles.calUnit}>Kcal / Day</div>
          </div>

          <div style={styles.macroGrid}>
            <div style={{ ...styles.macro, borderLeftColor: '#F43F5E' }}>
              <div style={styles.mVal}>{stats.protein}g</div>
              <div style={styles.mLab}>Protein</div>
            </div>
            <div style={{ ...styles.macro, borderLeftColor: '#10B981' }}>
              <div style={styles.mVal}>{stats.carbs}g</div>
              <div style={styles.mLab}>Carbs</div>
            </div>
            <div style={{ ...styles.macro, borderLeftColor: '#F59E0B' }}>
              <div style={styles.mVal}>{stats.fats}g</div>
              <div style={styles.mLab}>Fats</div>
            </div>
          </div>
        </div>
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: '32px', padding: '20px', maxWidth: '800px', margin: '0 auto' },
  configArea: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' },
  genderToggle: { display: 'flex', gap: '8px', background: 'var(--color-bg-elevated)', padding: '6px', borderRadius: '14px' },
  gBtn: { flex: 1, background: 'none', border: 'none', borderRadius: '10px', color: 'var(--color-text-muted)', fontSize: '11px', fontWeight: 'bold', padding: '12px', cursor: 'pointer' },
  gActive: { background: 'var(--color-accent)', color: '#fff' },
  params: { display: 'flex', flexDirection: 'column', gap: '20px' },
  param: { display: 'flex', flexDirection: 'column', gap: '8px' },
  row: { display: 'flex', justifyContent: 'space-between' },
  label: { fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' },
  val: { color: 'var(--color-accent)', fontWeight: 'bold' },
  slider: { width: '100%', accentColor: 'var(--color-accent)' },
  selectBox: { display: 'flex', flexDirection: 'column', gap: '8px' },
  select: { background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '12px', color: '#fff', padding: '12px', fontSize: '14px', outline: 'none' },
  resultsArea: { display: 'flex', flexDirection: 'column', gap: '24px' },
  goalTabs: { display: 'flex', gap: '10px' },
  goalTab: { flex: 1, background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '16px', color: 'var(--color-text-muted)', fontSize: '11px', fontWeight: 'bold', padding: '14px', cursor: 'pointer' },
  goalActive: { borderColor: 'var(--color-accent)', color: 'var(--color-accent)', background: 'rgba(99, 102, 241, 0.05)' },
  caloriesCard: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '24px', padding: '48px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' },
  calLabel: { fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase' },
  calValue: { fontSize: '64px', fontWeight: '900', color: '#fff', lineHeight: '1' },
  calUnit: { fontSize: '14px', fontWeight: 'bold', color: 'var(--color-accent)' },
  macroGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' },
  macro: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderLeftWidth: '4px', borderRadius: '16px', padding: '20px', textAlign: 'center' },
  mVal: { fontSize: '20px', fontWeight: 'bold', color: '#fff' },
  mLab: { fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginTop: '4px' }
};
