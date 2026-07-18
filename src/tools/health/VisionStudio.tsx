import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';

type TestType = 'snellen' | 'color' | 'amsler';

const SNELLEN_ROWS = [
  { text: 'E', size: '120px', acuity: '20/200' },
  { text: 'F P', size: '80px', acuity: '20/100' },
  { text: 'T O Z', size: '60px', acuity: '20/70' },
  { text: 'L P E D', size: '40px', acuity: '20/50' },
  { text: 'P E C F D', size: '30px', acuity: '20/40' },
  { text: 'E D F C Z P', size: '20px', acuity: '20/30' },
  { text: 'F E L O P Z D', size: '15px', acuity: '20/20' }
];

const ISHIHARA_PLATES = [
  { val: '12', type: 'red-green' as const },
  { val: '8', type: 'green-red' as const },
  { val: '29', type: 'blue-pink' as const },
  { val: '5', type: 'red-green' as const }
];

export default function VisionStudio() {
  const [test, setTest] = useState<TestType | null>(null);
  
  // Snellen Acuity states
  const [snellenIdx, setSnellenIdx] = useState(0);

  // Ishihara Color states
  const [colorIdx, setColorIdx] = useState(0);
  const [colorScore, setColorScore] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Setup Ishihara Canvas Drawing
  useEffect(() => {
    if (test === 'color' && colorIdx < ISHIHARA_PLATES.length && canvasRef.current) {
      const plate = ISHIHARA_PLATES[colorIdx];
      drawIshiharaPlate(canvasRef.current, plate.val, plate.type);
    }
  }, [test, colorIdx]);

  const drawIshiharaPlate = (canvas: HTMLCanvasElement, text: string, type: 'red-green' | 'green-red' | 'blue-pink') => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // 1. Draw text on offscreen canvas to get mask
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const oCtx = offscreen.getContext('2d');
    if (!oCtx) return;
    oCtx.fillStyle = '#000000';
    oCtx.font = 'bold 160px sans-serif';
    oCtx.textAlign = 'center';
    oCtx.textBaseline = 'middle';
    oCtx.fillText(text, width / 2, height / 2 + 10);
    const imgData = oCtx.getImageData(0, 0, width, height);

    // Helper to check if a point is in text mask
    const isInText = (x: number, y: number) => {
      const px = Math.floor(x);
      const py = Math.floor(y);
      if (px < 0 || px >= width || py < 0 || py >= height) return false;
      const alpha = imgData.data[(py * width + px) * 4 + 3];
      return alpha > 128;
    };

    // Color palettes
    const getFgColor = () => {
      if (type === 'red-green') {
        const r = Math.floor(200 + Math.random() * 55);
        const g = Math.floor(50 + Math.random() * 80);
        const b = Math.floor(30 + Math.random() * 50);
        return `rgb(${r}, ${g}, ${b})`;
      } else if (type === 'green-red') {
        const r = Math.floor(40 + Math.random() * 80);
        const g = Math.floor(180 + Math.random() * 75);
        const b = Math.floor(50 + Math.random() * 80);
        return `rgb(${r}, ${g}, ${b})`;
      } else {
        const r = Math.floor(220 + Math.random() * 35);
        const g = Math.floor(40 + Math.random() * 80);
        const b = Math.floor(150 + Math.random() * 105);
        return `rgb(${r}, ${g}, ${b})`;
      }
    };

    const getBgColor = () => {
      if (type === 'red-green') {
        if (Math.random() > 0.5) {
          const r = Math.floor(70 + Math.random() * 60);
          const g = Math.floor(120 + Math.random() * 60);
          const b = Math.floor(50 + Math.random() * 40);
          return `rgb(${r}, ${g}, ${b})`;
        } else {
          const r = Math.floor(110 + Math.random() * 40);
          const g = Math.floor(100 + Math.random() * 40);
          const b = Math.floor(40 + Math.random() * 30);
          return `rgb(${r}, ${g}, ${b})`;
        }
      } else if (type === 'green-red') {
        const r = Math.floor(180 + Math.random() * 75);
        const g = Math.floor(70 + Math.random() * 60);
        const b = Math.floor(40 + Math.random() * 50);
        return `rgb(${r}, ${g}, ${b})`;
      } else {
        const r = Math.floor(40 + Math.random() * 60);
        const g = Math.floor(130 + Math.random() * 80);
        const b = Math.floor(150 + Math.random() * 85);
        return `rgb(${r}, ${g}, ${b})`;
      }
    };

    interface Circle {
      x: number;
      y: number;
      r: number;
      color: string;
    }
    const circles: Circle[] = [];
    const cx = width / 2;
    const cy = height / 2;
    const maxRadius = width / 2 - 10;

    for (let attempts = 0; attempts < 2500; attempts++) {
      const rx = Math.random() * width;
      const ry = Math.random() * height;
      
      const distFromCenter = Math.hypot(rx - cx, ry - cy);
      if (distFromCenter + 4 > maxRadius) continue;

      let r = 3 + Math.random() * 7;
      if (distFromCenter > maxRadius - 20) r = 2 + Math.random() * 3;

      let overlap = false;
      for (const c of circles) {
        if (Math.hypot(rx - c.x, ry - c.y) < (r + c.r + 1.5)) {
          overlap = true;
          break;
        }
      }
      if (overlap) continue;

      const isFg = isInText(rx, ry);
      const color = isFg ? getFgColor() : getBgColor();

      circles.push({ x: rx, y: ry, r, color });
    }

    for (const c of circles) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fillStyle = c.color;
      ctx.fill();
    }
  };

  return (
    <ToolWrapper toolName="Vision Studio">
      <div style={styles.container}>
        {!test ? (
          <div style={styles.menu}>
            <button onClick={() => setTest('snellen')} style={styles.mCard}>
              <div style={styles.mIcon}>👁️‍🗨️</div>
              <div>
                <div style={styles.mTitle}>Visual Acuity</div>
                <div style={styles.mDesc}>Check how clearly you see (Snellen Chart)</div>
              </div>
            </button>
            <button onClick={() => { setTest('color'); setColorIdx(0); setColorScore(0); }} style={styles.mCard}>
              <div style={styles.mIcon}>🎨</div>
              <div>
                <div style={styles.mTitle}>Color Vision</div>
                <div style={styles.mDesc}>Check for color blindness (Programmatic Ishihara Plates)</div>
              </div>
            </button>
            <button onClick={() => setTest('amsler')} style={styles.mCard}>
              <div style={styles.mIcon}>🏁</div>
              <div>
                <div style={styles.mTitle}>Amsler Grid</div>
                <div style={styles.mDesc}>Test for center of vision distortion</div>
              </div>
            </button>
          </div>
        ) : (
          <div style={styles.testArea}>
            <button onClick={() => setTest(null)} style={styles.backBtn}>← EXIT TEST</button>

            {test === 'snellen' && (
              <div style={styles.snellen}>
                <div style={styles.chart}>
                  <motion.div 
                    key={snellenIdx}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    style={{ ...styles.rowText, fontSize: SNELLEN_ROWS[snellenIdx].size }}
                  >
                    {SNELLEN_ROWS[snellenIdx].text}
                  </motion.div>
                </div>
                <div style={styles.controls}>
                  <div style={styles.acuity}>{SNELLEN_ROWS[snellenIdx].acuity}</div>
                  <div style={styles.btnRow}>
                    <button onClick={() => setSnellenIdx(i => Math.max(0, i-1))} style={styles.ctrlBtn}>UP</button>
                    <button onClick={() => setSnellenIdx(i => Math.min(SNELLEN_ROWS.length - 1, i+1))} style={styles.ctrlBtn}>DOWN</button>
                  </div>
                </div>
              </div>
            )}

            {test === 'color' && (
              <div style={styles.color}>
                {colorIdx < ISHIHARA_PLATES.length ? (
                  <div style={styles.plateWrap}>
                    <canvas ref={canvasRef} width={300} height={300} style={styles.canvasPlate} />
                    <div style={styles.plateQuestion}>What number do you see in the circle?</div>
                    <div style={styles.optGrid}>
                      {['12', '8', '29', '5', '6', 'None'].map(v => (
                        <button 
                          key={v} 
                          onClick={() => { 
                            if(v === ISHIHARA_PLATES[colorIdx].val) setColorScore(s=>s+1); 
                            setColorIdx(i=>i+1); 
                          }} 
                          style={styles.optBtn}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={styles.result}>
                    <div style={styles.score}>{colorScore} / {ISHIHARA_PLATES.length}</div>
                    <div style={styles.rank}>
                      {colorScore === ISHIHARA_PLATES.length 
                        ? 'Perfect Color Vision' 
                        : colorScore >= 3 
                        ? 'Mild Color Vision Deficiency' 
                        : 'Significant Deficiency Detected'}
                    </div>
                    <button onClick={() => { setColorIdx(0); setColorScore(0); }} style={styles.retryBtn}>Retry</button>
                  </div>
                )}
              </div>
            )}

            {test === 'amsler' && (
              <div style={styles.amsler}>
                <div style={styles.gridBox}>
                  {Array.from({ length: 400 }).map((_, i) => (
                    <div key={i} style={{ ...styles.gridCell, background: i === 210 ? 'var(--color-accent)' : 'none' }} />
                  ))}
                </div>
                <div style={styles.instr}>
                  Cover one eye and stare at the center dot from about 12 inches away.
                  Are any lines wavy, distorted, or missing? Repeat for the other eye.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: '32px', padding: '20px', maxWidth: '600px', margin: '0 auto', color: 'var(--color-text-main)' },
  menu: { display: 'grid', gridTemplateColumns: '1fr', gap: '16px' },
  mCard: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '24px', padding: '24px', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '20px', transition: 'transform 0.2s', width: '100%' },
  mIcon: { fontSize: '32px', minWidth: '40px', textAlign: 'center' },
  mTitle: { fontSize: '18px', fontWeight: 'bold', color: 'var(--color-text-main)' },
  mDesc: { fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' },
  testArea: { display: 'flex', flexDirection: 'column', gap: '24px' },
  backBtn: { background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', alignSelf: 'flex-start' },
  snellen: { background: '#fff', borderRadius: '24px', padding: '40px', display: 'flex', flexDirection: 'column', gap: '40px', alignItems: 'center', color: '#000', boxShadow: '0 8px 30px rgba(0,0,0,0.15)' },
  chart: { minHeight: '140px', display: 'flex', alignItems: 'center' },
  rowText: { fontWeight: '900', fontFamily: 'monospace', letterSpacing: '8px', color: '#000' },
  controls: { width: '100%', borderTop: '1px solid #eee', paddingTop: '32px', textAlign: 'center' },
  acuity: { fontSize: '24px', fontWeight: 'bold', color: 'var(--color-accent)', marginBottom: '20px' },
  btnRow: { display: 'flex', gap: '12px', justifyContent: 'center' },
  ctrlBtn: { background: '#000', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 24px', cursor: 'pointer', fontWeight: 'bold' },
  color: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' },
  plateWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%' },
  canvasPlate: { width: '300px', height: '300px', borderRadius: '50%', border: '8px solid var(--color-bg-surface)', background: '#FFF' },
  plateQuestion: { fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text-main)', textAlign: 'center' },
  optGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', width: '100%', maxWidth: '360px' },
  optBtn: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '16px', color: 'var(--color-text-main)', padding: '16px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', transition: 'all 0.2s' },
  result: { textAlign: 'center', padding: '30px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' },
  score: { fontSize: '64px', fontWeight: '900', color: 'var(--color-accent)' },
  rank: { fontSize: '20px', fontWeight: 'bold', color: 'var(--color-text-main)' },
  retryBtn: { background: 'var(--color-accent)', border: 'none', borderRadius: '16px', color: 'var(--color-bg-main, #000)', padding: '14px 40px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' },
  amsler: { background: '#000', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' },
  gridBox: { display: 'grid', gridTemplateColumns: 'repeat(20, 1fr)', width: '340px', height: '340px', border: '1px solid #FFF' },
  gridCell: { border: '1px solid rgba(255, 255, 255, 0.3)' },
  instr: { fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', lineHeight: '1.6', maxWidth: '400px' }
};
