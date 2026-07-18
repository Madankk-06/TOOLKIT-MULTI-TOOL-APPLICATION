import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';

declare global {
  interface Window {
    _toastTimeout?: any;
  }
}

type ModeType = 'blow' | 'magnet' | 'freeze';

interface PaletteColor {
  r: number;
  g: number;
  b: number;
  hex: string;
  pct: string;
}

const SAMPLES = {
  city: "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600&q=80",
  nature: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&q=80",
  sunset: "https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=600&q=80",
  abstract: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600&q=80"
};

export default function ColorPicker() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<ModeType>('blow');
  const [palette, setPalette] = useState<PaletteColor[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [isDropActive, setIsDropActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Stats text
  const [particleCount, setParticleCount] = useState('0 particles');
  const [fpsVal, setFpsVal] = useState('0 fps');

  // Physics states via refs to prevent 60fps re-render lag
  const stateRef = useRef({
    particles: [] as Particle[],
    mode: 'blow' as ModeType,
    mx: 0,
    my: 0,
    isPointerDown: false,
    srcImg: null as HTMLImageElement | null,
    W: 800,
    H: 600,
  });

  // Track cursor position locally
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [isMouseOverCanvas, setIsMouseOverCanvas] = useState(false);

  // Dynamic mode ref update
  useEffect(() => {
    stateRef.current.mode = mode;
  }, [mode]);

  // Particle Class Definition inside
  class Particle {
    x: number;
    y: number;
    originX: number;
    originY: number;
    r: number;
    g: number;
    b: number;
    size: number;
    baseSize: number;
    vx: number;
    vy: number;
    friction: number;
    springStrength: number;
    wanderAngle: number;
    wanderSpeed: number;
    opacity: number;
    targetOpacity: number;

    constructor(x: number, y: number, originX: number, originY: number, r: number, g: number, b: number, size: number) {
      this.x = x;
      this.y = y;
      this.originX = originX;
      this.originY = originY;
      this.r = r;
      this.g = g;
      this.b = b;
      this.size = size;
      this.baseSize = size;
      this.vx = 0;
      this.vy = 0;
      this.friction = 0.92 + Math.random() * 0.04;
      this.springStrength = 0.008 + Math.random() * 0.008;
      this.wanderAngle = Math.random() * Math.PI * 2;
      this.wanderSpeed = 0.02 + Math.random() * 0.02;
      this.opacity = 0;
      this.targetOpacity = 1;
    }

    update() {
      this.opacity += (this.targetOpacity - this.opacity) * 0.05;

      if (stateRef.current.mode === 'freeze') {
        this.vx *= 0.95;
        this.vy *= 0.95;
        this.x += this.vx;
        this.y += this.vy;
        return;
      }

      // Spring back to origin
      const dx = this.originX - this.x;
      const dy = this.originY - this.y;
      this.vx += dx * this.springStrength;
      this.vy += dy * this.springStrength;

      // Gentle wander
      this.wanderAngle += this.wanderSpeed;
      this.vx += Math.cos(this.wanderAngle) * 0.05;
      this.vy += Math.sin(this.wanderAngle) * 0.05;

      const mx = stateRef.current.mx;
      const my = stateRef.current.my;
      const isPointerDown = stateRef.current.isPointerDown;
      const currentMode = stateRef.current.mode;

      // Mouse interaction
      if (isPointerDown || currentMode === 'magnet') {
        const mdx = this.x - mx;
        const mdy = this.y - my;
        const dist = Math.sqrt(mdx * mdx + mdy * mdy);
        const radius = currentMode === 'blow' ? 140 : currentMode === 'magnet' ? 200 : 0;

        if (dist < radius && dist > 0) {
          const force = (radius - dist) / radius;
          const angle = Math.atan2(mdy, mdx);

          if (currentMode === 'blow' && isPointerDown) {
            const power = force * force * 8;
            this.vx += Math.cos(angle) * power;
            this.vy += Math.sin(angle) * power;
            this.size = this.baseSize * (1 + force * 0.8);
          } else if (currentMode === 'magnet') {
            const power = force * 2;
            this.vx -= Math.cos(angle) * power;
            this.vy -= Math.sin(angle) * power;
            this.size = this.baseSize * (1 - force * 0.3);
          }
        } else {
          this.size += (this.baseSize - this.size) * 0.1;
        }
      } else {
        this.size += (this.baseSize - this.size) * 0.1;
      }

      this.vx *= this.friction;
      this.vy *= this.friction;
      this.x += this.vx;
      this.y += this.vy;
    }

    draw(ctx: CanvasRenderingContext2D) {
      ctx.globalAlpha = this.opacity;
      ctx.fillStyle = `rgb(${this.r},${this.g},${this.b})`;

      const s = Math.max(1, this.size);
      const half = s / 2;
      const rad = s > 4 ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(this.x - half + rad, this.y - half);
      ctx.lineTo(this.x + half - rad, this.y - half);
      ctx.quadraticCurveTo(this.x + half, this.y - half, this.x + half, this.y - half + rad);
      ctx.lineTo(this.x + half, this.y + half - rad);
      ctx.quadraticCurveTo(this.x + half, this.y + half, this.x + half - rad, this.y + half);
      ctx.lineTo(this.x - half + rad, this.y + half);
      ctx.quadraticCurveTo(this.x - half, this.y + half, this.x - half, this.y + half - rad);
      ctx.lineTo(this.x - half, this.y - half + rad);
      ctx.quadraticCurveTo(this.x - half, this.y - half, this.x - half + rad, this.y - half);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // Setup loop and dimensions
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const handleResize = () => {
      if (!cvs || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const W = rect.width;
      const H = rect.height || 600;
      cvs.width = W;
      cvs.height = H;
      stateRef.current.W = W;
      stateRef.current.H = H;
      if (stateRef.current.srcImg) shatterImage(stateRef.current.srcImg);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    let frameCount = 0;
    let lastFpsTime = performance.now();
    let animId = 0;

    const renderLoop = () => {
      ctx.fillStyle = 'rgba(8, 8, 12, 0.25)';
      ctx.fillRect(0, 0, stateRef.current.W, stateRef.current.H);

      const parts = stateRef.current.particles;
      for (let i = 0; i < parts.length; i++) {
        parts[i].update();
        parts[i].draw(ctx);
      }

      frameCount++;
      const now = performance.now();
      if (now - lastFpsTime >= 500) {
        const fps = Math.round(frameCount / ((now - lastFpsTime) / 1000));
        setFpsVal(`${fps} fps`);
        frameCount = 0;
        lastFpsTime = now;
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);

    // Check for auto-loaded image from chatbot
    let loadedFromChatbot = false;
    try {
      const pendingData = sessionStorage.getItem('chatbot-pending-file');
      if (pendingData) {
        const parsed = JSON.parse(pendingData);
        if (parsed.isImage) {
          sessionStorage.removeItem('chatbot-pending-file');
          const mime = parsed.type || 'image/png';
          loadImage(`data:${mime};base64,${parsed.base64}`);
          loadedFromChatbot = true;
        }
      }
    } catch (e) {
      console.error("Failed to load chatbot pending file in ColorPicker:", e);
    }

    if (!loadedFromChatbot) {
      // Auto-load sample based on query params or fallback to abstract
      const params = new URLSearchParams(window.location.search);
      const sampleParam = params.get('sample') || params.get('prefill_sample');
      if (sampleParam && SAMPLES[sampleParam as keyof typeof SAMPLES]) {
        loadImage(SAMPLES[sampleParam as keyof typeof SAMPLES]);
      } else {
        loadImage(SAMPLES.abstract);
      }
    }

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, []);

  // Image shatter logic
  const shatterImage = (img: HTMLImageElement) => {
    setIsLoading(true);

    setTimeout(() => {
      const W = stateRef.current.W;
      const H = stateRef.current.H;
      const scale = Math.min((W * 0.7) / img.width, (H * 0.6) / img.height, 1);
      const iw = Math.floor(img.width * scale);
      const ih = Math.floor(img.height * scale);
      const ox = Math.floor((W - iw) / 2);
      const oy = Math.floor((H - ih) / 2);

      const oc = document.createElement('canvas');
      oc.width = iw;
      oc.height = ih;
      const octx = oc.getContext('2d');
      if (!octx) return;
      octx.drawImage(img, 0, 0, iw, ih);
      const imgData = octx.getImageData(0, 0, iw, ih).data;

      const targetParticles = Math.min(6000, Math.max(1500, (iw * ih) / 24));
      const gap = Math.max(2, Math.floor(Math.sqrt((iw * ih) / targetParticles)));
      const pSize = gap * 0.95;

      const tempParticles = [];

      for (let y = 0; y < ih; y += gap) {
        for (let x = 0; x < iw; x += gap) {
          const i = (y * iw + x) * 4;
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          const a = imgData[i + 3];

          if (a < 128) continue;

          const px = ox + x;
          const py = oy + y;

          const edge = Math.random();
          let sx, sy;
          if (edge < 0.25) {
            sx = Math.random() * W;
            sy = -50;
          } else if (edge < 0.5) {
            sx = Math.random() * W;
            sy = H + 50;
          } else if (edge < 0.75) {
            sx = -50;
            sy = Math.random() * H;
          } else {
            sx = W + 50;
            sy = Math.random() * H;
          }

          const p = new Particle(sx, sy, px, py, r, g, b, pSize);
          p.vx = (px - sx) * 0.01 + (Math.random() - 0.5) * 2;
          p.vy = (py - sy) * 0.01 + (Math.random() - 0.5) * 2;
          tempParticles.push(p);
        }
      }

      stateRef.current.particles = tempParticles;
      setParticleCount(`${tempParticles.length.toLocaleString()} particles`);
      
      extractPalette(imgData, iw, ih);
      setIsLoading(false);
      triggerToast(`${tempParticles.length.toLocaleString()} particles created`);
    }, 120);
  };

  // Median Cut color extraction
  const extractPalette = (imgData: Uint8ClampedArray, w: number, h: number) => {
    const colors: [number, number, number][] = [];
    const step = Math.max(1, Math.floor((w * h) / 10000));

    for (let i = 0; i < w * h; i += step) {
      const idx = i * 4;
      const r = imgData[idx];
      const g = imgData[idx + 1];
      const b = imgData[idx + 2];
      const a = imgData[idx + 3];
      if (a < 128) continue;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (max - min < 8 && max < 240 && min > 15) continue;
      colors.push([r, g, b]);
    }

    const buckets = medianCut(colors, 6);

    const tempPalette = buckets.map((bucket) => {
      let tr = 0, tg = 0, tb = 0;
      bucket.forEach((c) => {
        tr += c[0];
        tg += c[1];
        tb += c[2];
      });
      const len = bucket.length || 1;
      const r = Math.round(tr / len);
      const g = Math.round(tg / len);
      const b = Math.round(tb / len);
      return {
        r,
        g,
        b,
        hex: rgbHex(r, g, b),
        pct: ((bucket.length / (colors.length || 1)) * 100).toFixed(1)
      };
    });

    tempPalette.sort((a, b) => {
      const lumA = 0.299 * a.r + 0.587 * a.g + 0.114 * a.b;
      const lumB = 0.299 * b.r + 0.587 * b.g + 0.114 * b.b;
      return lumB - lumA;
    });

    setPalette(tempPalette);
  };

  const medianCut = (colors: [number, number, number][], depth: number): [number, number, number][][] => {
    if (depth <= 1 || colors.length === 0) return [colors];

    let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0;
    colors.forEach((c) => {
      if (c[0] < rMin) rMin = c[0];
      if (c[0] > rMax) rMax = c[0];
      if (c[1] < gMin) gMin = c[1];
      if (c[1] > gMax) gMax = c[1];
      if (c[2] < bMin) bMin = c[2];
      if (c[2] > bMax) bMax = c[2];
    });

    const rRange = rMax - rMin;
    const gRange = gMax - gMin;
    const bRange = bMax - bMin;

    let channel = 0;
    if (gRange >= rRange && gRange >= bRange) channel = 1;
    else if (bRange >= rRange && bRange >= gRange) channel = 2;

    colors.sort((a, b) => a[channel] - b[channel]);
    const mid = Math.floor(colors.length / 2);

    const left = medianCut(colors.slice(0, mid), depth / 2);
    const right = medianCut(colors.slice(mid), depth / 2);
    return [...left, ...right];
  };

  const rgbHex = (r: number, g: number, b: number) => {
    const h = (v: number) => {
      const s = v.toString(16);
      return s.length === 1 ? '0' + s : s;
    };
    return `#${h(r)}${h(g)}${h(b)}`;
  };

  const loadImage = (src: string) => {
    setIsLoading(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      stateRef.current.srcImg = img;
      shatterImage(img);
    };
    img.onerror = () => {
      setIsLoading(false);
      triggerToast('Failed to load image');
    };
    img.src = src;
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        explodeAll();
      }
      if (e.key === '1') setMode('blow');
      if (e.key === '2') setMode('magnet');
      if (e.key === '3') setMode('freeze');
      if (e.key === 'c') copyCSS();
      if (e.key === 'r') reassemble();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [palette]);

  const explodeAll = () => {
    stateRef.current.particles.forEach((p) => {
      const angle = Math.random() * Math.PI * 2;
      const power = 5 + Math.random() * 15;
      p.vx += Math.cos(angle) * power;
      p.vy += Math.sin(angle) * power;
    });
    triggerToast('💥 Boom!');
  };

  const reassemble = () => {
    stateRef.current.particles.forEach((p) => {
      p.springStrength = 0.05;
      setTimeout(() => {
        p.springStrength = 0.008 + Math.random() * 0.008;
      }, 2000);
    });
    triggerToast('Reassembling...');
  };

  // File Upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        stateRef.current.srcImg = img;
        shatterImage(img);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Drag & drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        stateRef.current.srcImg = img;
        shatterImage(img);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Pointer event handlers
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = e.currentTarget.width / rect.width;
    const scaleY = e.currentTarget.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    stateRef.current.mx = x;
    stateRef.current.my = y;
    
    setCursorPos({ x: e.clientX, y: e.clientY });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    stateRef.current.isPointerDown = true;
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = e.currentTarget.width / rect.width;
    const scaleY = e.currentTarget.height / rect.height;
    stateRef.current.mx = (e.clientX - rect.left) * scaleX;
    stateRef.current.my = (e.clientY - rect.top) * scaleY;
    setCursorPos({ x: e.clientX, y: e.clientY });
  };

  const handlePointerUp = () => {
    stateRef.current.isPointerDown = false;
  };

  // Toast helper
  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
    clearTimeout(window._toastTimeout);
    window._toastTimeout = setTimeout(() => {
      setShowToast(false);
    }, 2000);
  };

  // Copiers
  const copyColor = (hex: string) => {
    navigator.clipboard.writeText(hex.toUpperCase()).catch(() => {});
    triggerToast(`Copied ${hex.toUpperCase()}`);
  };

  const copyCSS = () => {
    if (!palette.length) {
      triggerToast('Load an image first');
      return;
    }
    const css = `:root {\n${palette
      .map((c, i) => `  --color-${i + 1}: ${c.hex}; /* rgb(${c.r}, ${c.g}, ${c.b}) — ${c.pct}% */`)
      .join('\n')}\n}`;
    navigator.clipboard.writeText(css).catch(() => {});
    triggerToast('CSS variables copied');
  };

  const copySVG = () => {
    if (!palette.length) {
      triggerToast('Load an image first');
      return;
    }
    const sw = 100, sh = 120;
    const rects = palette
      .map((c, i) => `  <rect x="${i * sw}" y="0" width="${sw}" height="${sh}" fill="${c.hex}"/>`)
      .join('\n');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${palette.length * sw}" height="${sh}">\n${rects}\n</svg>`;
    navigator.clipboard.writeText(svg).catch(() => {});
    triggerToast('SVG palette copied');
  };

  const resetAll = () => {
    stateRef.current.particles = [];
    stateRef.current.srcImg = null;
    setPalette([]);
    setParticleCount('0 particles');
    triggerToast('Cleared workspace');
  };

  return (
    <ToolWrapper toolName="Particulate (Color Picker)" borderless>
      <div 
        ref={containerRef} 
        style={styles.mainWrapper}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Dynamic Styles Injection */}
        <style>{`
          .part-cursor {
            position: fixed;
            z-index: 100;
            pointer-events: none;
            width: 40px;
            height: 40px;
            margin: -20px 0 0 -20px;
            border-radius: 50%;
            border: 1.5px solid rgba(255, 255, 255, 0.35);
            transition: width 0.3s, height 0.3s, margin 0.3s, border-color 0.3s, background 0.3s;
            mix-blend-mode: difference;
          }
          .part-cursor.blow {
            width: 120px;
            height: 120px;
            margin: -60px 0 0 -60px;
            border-color: rgba(255, 255, 255, 0.15);
            background: rgba(255, 255, 255, 0.03);
          }
          .part-cursor.magnet {
            width: 80px;
            height: 80px;
            margin: -40px 0 0 -40px;
            border-color: rgba(255, 200, 100, 0.4);
            background: rgba(255, 200, 100, 0.05);
          }
          .part-cursor.freeze {
            border-color: rgba(135, 206, 250, 0.6);
            background: rgba(135, 206, 250, 0.05);
          }
        `}</style>

        {/* Custom cursor element */}
        {isMouseOverCanvas && (
          <div 
            className={`part-cursor ${mode} ${stateRef.current.isPointerDown && mode === 'blow' ? 'blow' : ''}`}
            style={{ left: cursorPos.x, top: cursorPos.y }}
          />
        )}

        <canvas
          ref={canvasRef}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            background: '#08080c',
            cursor: 'none',
            zIndex: 1
          }}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerEnter={() => setIsMouseOverCanvas(true)}
          onPointerLeave={() => {
            setIsMouseOverCanvas(false);
            stateRef.current.isPointerDown = false;
          }}
        />

        {/* UI Overlay */}
        <div style={styles.uiOverlay}>
          <div style={styles.topBar}>
            <h1 style={styles.brandTitle}>Particulate</h1>
            <p style={styles.taglineText}>Shatter images into color. Collect the pieces.</p>
            
            <div style={styles.toolBar}>
              <div 
                style={styles.toolBtn}
                onClick={() => fileInputRef.current?.click()}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 14, height: 14 }}>
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
                Upload
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  accept="image/*" 
                  style={{ display: 'none' }}
                />
              </div>

              {(['city', 'nature', 'sunset', 'abstract'] as const).map(key => (
                <button 
                  key={key} 
                  style={styles.toolBtn}
                  onClick={() => loadImage(SAMPLES[key])}
                >
                  {key === 'city' ? '🌃 City' : key === 'nature' ? '🌿 Nature' : key === 'sunset' ? '🌅 Sunset' : '🎨 Abstract'}
                </button>
              ))}

              <div style={styles.divider} />

              <button 
                style={{ ...styles.toolBtn, ...(mode === 'blow' ? styles.toolBtnActive : {}) }}
                onClick={() => setMode('blow')}
              >
                💥 Blow
              </button>
              <button 
                style={{ ...styles.toolBtn, ...(mode === 'magnet' ? styles.toolBtnActive : {}) }}
                onClick={() => setMode('magnet')}
              >
                🧲 Gather
              </button>
              <button 
                style={{ ...styles.toolBtn, ...(mode === 'freeze' ? styles.toolBtnActive : {}) }}
                onClick={() => setMode('freeze')}
              >
                ❄️ Freeze
              </button>
            </div>
          </div>

          <div style={styles.bottomBar}>
            <div style={styles.infoBar}>
              <span>{particleCount}</span>
              <span>·</span>
              <span>{fpsVal}</span>
            </div>

            <div style={styles.paletteDock}>
              {palette.length === 0 ? (
                // Render Empty Slots
                [...Array(6)].map((_, i) => (
                  <div key={i} style={styles.palColorEmpty}>
                    <div style={styles.palSwatchEmpty} />
                    <span style={styles.palHexText}>—</span>
                  </div>
                ))
              ) : (
                palette.map((c, i) => (
                  <div 
                    key={i} 
                    style={styles.palColorCard}
                    onClick={() => copyColor(c.hex)}
                  >
                    <div style={{ ...styles.palSwatch, backgroundColor: c.hex }} />
                    <span style={styles.palHexText}>{c.hex.toUpperCase()}</span>
                    <span style={styles.palPctText}>{c.pct}%</span>
                  </div>
                ))
              )}

              <div style={styles.dockActions}>
                <button 
                  style={styles.dockBtn} 
                  onClick={copyCSS} 
                  title="Copy CSS Variables"
                >
                  {'{ }'}
                </button>
                <button 
                  style={styles.dockBtn} 
                  onClick={copySVG} 
                  title="Copy SVG"
                >
                  ◇
                </button>
                <button 
                  style={styles.dockBtn} 
                  onClick={resetAll} 
                  title="Reset"
                >
                  ✕
                </button>
              </div>
            </div>

            <p style={styles.hintText}>Drag & drop an image or click a sample · click canvas to interact</p>
          </div>
        </div>

        {/* Drag & Drop Overlay */}
        <AnimatePresence>
          {isDropActive && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={styles.dropZone}
            >
              <div style={styles.dropRing}>📸</div>
              <p style={{ marginTop: 12, fontSize: 15 }}>Drop your image here</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading Spinner */}
        <AnimatePresence>
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={styles.loadingScreen}
            >
              <div style={styles.spinner} />
              <p style={{ marginTop: 12, fontSize: 13, color: '#bbb' }}>Shattering into particles...</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toast Alert */}
        <AnimatePresence>
          {showToast && toastMsg && (
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              style={styles.toastCard}
            >
              {toastMsg}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  mainWrapper: {
    position: 'relative',
    width: '100%',
    height: 'calc(100vh - 160px)',
    minHeight: '600px',
    borderRadius: '24px',
    border: 'none',
    overflow: 'hidden',
    userSelect: 'none',
    fontFamily: '"Inter", sans-serif',
    color: '#fff',
    background: '#08080c'
  },
  uiOverlay: {
    position: 'absolute',
    inset: 0,
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    pointerEvents: 'none',
    padding: '24px 24px 32px 24px'
  },
  topBar: {
    textAlign: 'center',
    pointerEvents: 'auto',
    width: '100%'
  },
  brandTitle: {
    fontSize: 'clamp(1.6rem, 4vw, 2.6rem)',
    fontWeight: 900,
    letterSpacing: '-1px',
    lineHeight: 1,
    marginBottom: '6px',
    background: 'linear-gradient(135deg, #fff 20%, rgba(255, 255, 255, 0.4))',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  taglineText: {
    fontSize: '12px',
    fontWeight: 300,
    opacity: 0.4,
    letterSpacing: '0.5px',
    marginBottom: '18px'
  },
  toolBar: {
    display: 'flex',
    gap: '6px',
    justifyContent: 'center',
    flexWrap: 'wrap',
    maxWidth: '720px',
    margin: '0 auto'
  },
  toolBtn: {
    padding: '8px 14px',
    borderRadius: '20px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    background: 'rgba(255, 255, 255, 0.03)',
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    backdropFilter: 'blur(8px)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px'
  },
  toolBtnActive: {
    background: 'rgba(255, 255, 255, 0.9)',
    color: '#08080c',
    borderColor: 'transparent',
    fontWeight: 800
  },
  divider: {
    width: '1px',
    height: '20px',
    background: 'rgba(255, 255, 255, 0.08)',
    margin: '0 4px',
    alignSelf: 'center'
  },
  bottomBar: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    pointerEvents: 'auto',
    width: '100%',
    maxWidth: '640px'
  },
  infoBar: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    fontSize: '10px',
    opacity: 0.35,
    letterSpacing: '1.2px',
    fontFamily: 'monospace',
    textTransform: 'uppercase'
  },
  paletteDock: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 14px',
    width: '100%',
    background: 'rgba(0, 0, 0, 0.65)',
    backdropFilter: 'blur(28px)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '20px',
    boxShadow: '0 16px 56px rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    minHeight: '74px'
  },
  palColorCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    flex: 1,
    maxWidth: '85px',
    minWidth: 0,
    cursor: 'pointer',
    transition: 'all 0.25s'
  },
  palSwatch: {
    width: '100%',
    aspectRatio: '1',
    borderRadius: '10px',
    border: '2.5px solid rgba(255, 255, 255, 0.06)',
    transition: 'border-color 0.2s'
  },
  palHexText: {
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '0.3px',
    opacity: 0.5,
    fontFamily: 'monospace',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100%'
  },
  palPctText: {
    fontSize: '8px',
    opacity: 0.3
  },
  palColorEmpty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    flex: 1,
    maxWidth: '85px',
    minWidth: 0
  },
  palSwatchEmpty: {
    width: '100%',
    aspectRatio: '1',
    borderRadius: '10px',
    border: '1.5px dashed rgba(255, 255, 255, 0.07)',
    background: 'rgba(255, 255, 255, 0.01)'
  },
  dockActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginLeft: '6px',
    flexShrink: 0
  },
  dockBtn: {
    width: '30px',
    height: '20px',
    borderRadius: '6px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    background: 'rgba(255, 255, 255, 0.02)',
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: '9px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    fontFamily: 'inherit'
  },
  hintText: {
    fontSize: '9px',
    opacity: 0.25,
    fontWeight: 300,
    letterSpacing: '1px',
    textTransform: 'uppercase'
  },
  dropZone: {
    position: 'absolute',
    inset: 0,
    zIndex: 200,
    background: 'rgba(8, 8, 12, 0.88)',
    backdropFilter: 'blur(20px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
  },
  dropRing: {
    width: '140px',
    height: '140px',
    borderRadius: '50%',
    border: '2px dashed rgba(255, 255, 255, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2.5rem'
  },
  loadingScreen: {
    position: 'absolute',
    inset: 0,
    zIndex: 300,
    background: 'rgba(8, 8, 12, 0.95)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: '12px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: '3px solid rgba(255, 255, 255, 0.1)',
    borderTopColor: 'rgba(255, 255, 255, 0.6)',
    animation: 'spin 0.8s linear infinite'
  },
  toastCard: {
    position: 'absolute',
    bottom: '120px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    padding: '10px 22px',
    borderRadius: '14px',
    fontSize: '12px',
    fontWeight: 600,
    zIndex: 50,
    pointerEvents: 'none',
    letterSpacing: '0.2px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
  }
};
