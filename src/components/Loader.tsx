import React from 'react';
import { useTheme } from '../context/ThemeContext';
import type { ThemeTokens } from '../context/ThemeContext';

// Helper to convert hex to HSL
function hexToHsl(hex: string) {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export default function Loader({ message = 'Loading...' }: { message?: string }) {
  const { tokens } = useTheme();
  const baseHsl = hexToHsl(tokens.accent);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '380px',
      gap: '35px',
      overflow: 'hidden',
      width: '100%',
      padding: '30px 0',
      boxSizing: 'border-box'
    }}>
      <style>{`
        .spinning-number {
          position: relative;
          width: 320px;
          height: 320px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.6em;
          transform: scale(0.9);
        }
        .spinning-number .wheel {
          position: absolute;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: spinning-number-spin var(--t) linear infinite var(--r1);
        }
        @keyframes spinning-number-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spinning-number .number {
          position: absolute;
          transform: translate(-50%, -50%) rotate(var(--a)) translateY(calc(var(--l) * -1)) scale(var(--s));
        }
        .spinning-number .number::before {
          content: '1';
          --z: 1.9;
          --r: normal;
          transform: translate(-50%, -50%);
          animation: spinning-number-changing calc(var(--t) * var(--z)) calc(-1 * var(--z) * var(--t) * var(--i) / var(--m) - 60s) linear infinite var(--r);
        }
        @keyframes spinning-number-changing {
          0% { content: '1'; }
          100% { content: '0'; }
        }
      `}</style>

      <div className="spinning-number">
        <div style={{ color: `hsl(${(baseHsl.h + 0 * 4.5) % 360}, ${baseHsl.s}%, ${Math.max(30, Math.min(85, baseHsl.l - 0 * 1.5))}%)`, "--l": "3em", "--m": "22", "--t": "22s", "--r1": "normal", "--s": "1" } as React.CSSProperties} className="wheel">
          <div style={{ "--a": "0deg", "--i": "0" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "16deg", "--i": "1", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "32deg", "--i": "2", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "49deg", "--i": "3" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "65deg", "--i": "4", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "81deg", "--i": "5", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "98deg", "--i": "6", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "114deg", "--i": "7", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "130deg", "--i": "8", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "147deg", "--i": "9" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "163deg", "--i": "10", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "180deg", "--i": "11" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "196deg", "--i": "12", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "212deg", "--i": "13" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "229deg", "--i": "14" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "245deg", "--i": "15" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "261deg", "--i": "16", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "278deg", "--i": "17" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "294deg", "--i": "18", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "310deg", "--i": "19", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "327deg", "--i": "20" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "343deg", "--i": "21", "--r": "reverse" } as React.CSSProperties} className="number"></div>
        </div>
        <div style={{ color: `hsl(${(baseHsl.h + 1 * 4.5) % 360}, ${baseHsl.s}%, ${Math.max(30, Math.min(85, baseHsl.l - 1 * 1.5))}%)`, "--l": "4em", "--m": "29", "--t": "29s", "--r1": "reverse", "--s": "0.9977810650887574" } as React.CSSProperties} className="wheel">
          <div style={{ "--a": "0deg", "--i": "0" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "12deg", "--i": "1" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "24deg", "--i": "2", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "37deg", "--i": "3", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "49deg", "--i": "4", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "62deg", "--i": "5", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "74deg", "--i": "6" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "86deg", "--i": "7" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "99deg", "--i": "8", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "111deg", "--i": "9", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "124deg", "--i": "10" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "136deg", "--i": "11", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "148deg", "--i": "12", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "161deg", "--i": "13", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "173deg", "--i": "14" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "186deg", "--i": "15" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "198deg", "--i": "16", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "211deg", "--i": "17" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "223deg", "--i": "18" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "235deg", "--i": "19" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "248deg", "--i": "20" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "260deg", "--i": "21", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "273deg", "--i": "22", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "285deg", "--i": "23" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "297deg", "--i": "24", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "310deg", "--i": "25", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "322deg", "--i": "26", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "335deg", "--i": "27" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "347deg", "--i": "28", "--r": "reverse" } as React.CSSProperties} className="number"></div>
        </div>
        <div style={{ color: `hsl(${(baseHsl.h + 2 * 4.5) % 360}, ${baseHsl.s}%, ${Math.max(30, Math.min(85, baseHsl.l - 2 * 1.5))}%)`, "--l": "5em", "--m": "36", "--t": "36s", "--r1": "reverse", "--s": "0.9911242603550295" } as React.CSSProperties} className="wheel">
          <div style={{ "--a": "0deg", "--i": "0" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "10deg", "--i": "1" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "20deg", "--i": "2" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "29deg", "--i": "3", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "40deg", "--i": "4" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "50deg", "--i": "5" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "59deg", "--i": "6", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "70deg", "--i": "7" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "80deg", "--i": "8", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "90deg", "--i": "9", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "100deg", "--i": "10" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "110deg", "--i": "11", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "119deg", "--i": "12" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "130deg", "--i": "13", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "140deg", "--i": "14" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "150deg", "--i": "15" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "160deg", "--i": "16", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "170deg", "--i": "17", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "180deg", "--i": "18" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "190deg", "--i": "19" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "200deg", "--i": "20" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "209deg", "--i": "21", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "220deg", "--i": "22", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "229deg", "--i": "23", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "239deg", "--i": "24" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "249deg", "--i": "25" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "260deg", "--i": "26", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "270deg", "--i": "27", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "280deg", "--i": "28" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "290deg", "--i": "29", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "300deg", "--i": "30", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "310deg", "--i": "31" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "320deg", "--i": "32" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "329deg", "--i": "33", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "340deg", "--i": "34" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "350deg", "--i": "35", "--r": "reverse" } as React.CSSProperties} className="number"></div>
        </div>
        <div style={{ color: `hsl(${(baseHsl.h + 3 * 4.5) % 360}, ${baseHsl.s}%, ${Math.max(30, Math.min(85, baseHsl.l - 3 * 1.5))}%)`, "--l": "6em", "--m": "44", "--t": "44s", "--r1": "reverse", "--s": "0.9800295857988166" } as React.CSSProperties} className="wheel">
          <div style={{ "--a": "0deg", "--i": "0", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "8deg", "--i": "1" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "24deg", "--i": "3", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "49deg", "--i": "6", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "57deg", "--i": "7", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "65deg", "--i": "8" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "73deg", "--i": "9" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "81deg", "--i": "10", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "90deg", "--i": "11", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "98deg", "--i": "12", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "106deg", "--i": "13" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "114deg", "--i": "14" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "122deg", "--i": "15" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "130deg", "--i": "16" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "139deg", "--i": "17", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "147deg", "--i": "18", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "155deg", "--i": "19", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "163deg", "--i": "20", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "171deg", "--i": "21" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "180deg", "--i": "22" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "188deg", "--i": "23" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "196deg", "--i": "24" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "204deg", "--i": "25", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "212deg", "--i": "26" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "220deg", "--i": "27" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "229deg", "--i": "28", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "237deg", "--i": "29", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "245deg", "--i": "30", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "253deg", "--i": "31", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "261deg", "--i": "32", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "270deg", "--i": "33", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "278deg", "--i": "34" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "286deg", "--i": "35", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "294deg", "--i": "36" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "302deg", "--i": "37", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "310deg", "--i": "38", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "319deg", "--i": "39", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "327deg", "--i": "40" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "335deg", "--i": "41" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "343deg", "--i": "42", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "351deg", "--i": "43" } as React.CSSProperties} className="number"></div>
        </div>
        <div style={{ color: `hsl(${(baseHsl.h + 4 * 4.5) % 360}, ${baseHsl.s}%, ${Math.max(30, Math.min(85, baseHsl.l - 4 * 1.5))}%)`, "--l": "7em", "--m": "51", "--t": "51s", "--r1": "normal", "--s": "0.9644970414201184" } as React.CSSProperties} className="wheel">
          <div style={{ "--a": "0deg", "--i": "0", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "7deg", "--i": "1", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "14deg", "--i": "2", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "21deg", "--i": "3" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "28deg", "--i": "4", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "35deg", "--i": "5", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "42deg", "--i": "6" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "49deg", "--i": "7", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "56deg", "--i": "8" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "63deg", "--i": "9" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "70deg", "--i": "10" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "77deg", "--i": "11" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "84deg", "--i": "12" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "91deg", "--i": "13", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "98deg", "--i": "14", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "105deg", "--i": "15" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "112deg", "--i": "16" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "119deg", "--i": "17", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "127deg", "--i": "18", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "134deg", "--i": "19", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "148deg", "--i": "21", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "155deg", "--i": "22", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "162deg", "--i": "23" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "169deg", "--i": "24", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "176deg", "--i": "25", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "183deg", "--i": "26", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "190deg", "--i": "27", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "197deg", "--i": "28", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "204deg", "--i": "29", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "211deg", "--i": "30", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "218deg", "--i": "31", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "225deg", "--i": "32", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "232deg", "--i": "33", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "239deg", "--i": "34", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "247deg", "--i": "35", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "254deg", "--i": "36" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "261deg", "--i": "37" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "268deg", "--i": "38", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "275deg", "--i": "39" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "282deg", "--i": "40", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "296deg", "--i": "42", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "310deg", "--i": "44", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "317deg", "--i": "45" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "324deg", "--i": "46" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "331deg", "--i": "47" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "338deg", "--i": "48" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "345deg", "--i": "49", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "352deg", "--i": "50" } as React.CSSProperties} className="number"></div>
        </div>
        <div style={{ color: `hsl(${(baseHsl.h + 5 * 4.5) % 360}, ${baseHsl.s}%, ${Math.max(30, Math.min(85, baseHsl.l - 5 * 1.5))}%)`, "--l": "8em", "--m": "59", "--t": "59s", "--r1": "normal", "--s": "0.9445266272189349" } as React.CSSProperties} className="wheel">
          <div style={{ "--a": "0deg", "--i": "0", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "6deg", "--i": "1" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "12deg", "--i": "2" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "18deg", "--i": "3", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "24deg", "--i": "4" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "30deg", "--i": "5", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "36deg", "--i": "6", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "54deg", "--i": "9" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "61deg", "--i": "10" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "67deg", "--i": "11" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "73deg", "--i": "12" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "79deg", "--i": "13", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "85deg", "--i": "14", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "91deg", "--i": "15", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "103deg", "--i": "17" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "115deg", "--i": "19", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "122deg", "--i": "20", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "128deg", "--i": "21" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "134deg", "--i": "22", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "140deg", "--i": "23" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "146deg", "--i": "24" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "152deg", "--i": "25" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "164deg", "--i": "27" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "170deg", "--i": "28" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "176deg", "--i": "29" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "183deg", "--i": "30" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "189deg", "--i": "31", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "195deg", "--i": "32", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "201deg", "--i": "33" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "207deg", "--i": "34", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "213deg", "--i": "35", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "219deg", "--i": "36" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "231deg", "--i": "38" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "237deg", "--i": "39" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "244deg", "--i": "40", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "250deg", "--i": "41", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "256deg", "--i": "42" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "262deg", "--i": "43", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "268deg", "--i": "44", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "274deg", "--i": "45", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "280deg", "--i": "46", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "292deg", "--i": "48" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "298deg", "--i": "49" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "311deg", "--i": "51" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "317deg", "--i": "52", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "323deg", "--i": "53", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "329deg", "--i": "54" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "335deg", "--i": "55", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "341deg", "--i": "56", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "347deg", "--i": "57", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "353deg", "--i": "58", "--r": "reverse" } as React.CSSProperties} className="number"></div>
        </div>
        <div style={{ color: `hsl(${(baseHsl.h + 6 * 4.5) % 360}, ${baseHsl.s}%, ${Math.max(30, Math.min(85, baseHsl.l - 6 * 1.5))}%)`, "--l": "9em", "--m": "66", "--t": "66s", "--r1": "normal", "--s": "0.9201183431952662" } as React.CSSProperties} className="wheel">
          <div style={{ "--a": "5deg", "--i": "1" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "10deg", "--i": "2", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "16deg", "--i": "3" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "21deg", "--i": "4", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "27deg", "--i": "5", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "32deg", "--i": "6", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "38deg", "--i": "7", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "43deg", "--i": "8", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "49deg", "--i": "9", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "54deg", "--i": "10", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "59deg", "--i": "11", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "65deg", "--i": "12", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "70deg", "--i": "13" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "76deg", "--i": "14" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "81deg", "--i": "15", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "87deg", "--i": "16" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "92deg", "--i": "17" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "103deg", "--i": "19", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "109deg", "--i": "20", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "114deg", "--i": "21" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "119deg", "--i": "22", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "130deg", "--i": "24" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "136deg", "--i": "25", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "141deg", "--i": "26", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "147deg", "--i": "27", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "152deg", "--i": "28", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "158deg", "--i": "29" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "163deg", "--i": "30", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "169deg", "--i": "31", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "180deg", "--i": "33" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "185deg", "--i": "34", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "190deg", "--i": "35" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "196deg", "--i": "36" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "207deg", "--i": "38", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "212deg", "--i": "39", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "218deg", "--i": "40", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "223deg", "--i": "41", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "234deg", "--i": "43", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "239deg", "--i": "44", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "245deg", "--i": "45" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "250deg", "--i": "46", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "256deg", "--i": "47" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "272deg", "--i": "50", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "283deg", "--i": "52" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "289deg", "--i": "53", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "294deg", "--i": "54" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "299deg", "--i": "55", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "305deg", "--i": "56" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "310deg", "--i": "57", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "321deg", "--i": "59", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "327deg", "--i": "60" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "338deg", "--i": "62", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "343deg", "--i": "63", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "349deg", "--i": "64", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "354deg", "--i": "65" } as React.CSSProperties} className="number"></div>
        </div>
        <div style={{ color: `hsl(${(baseHsl.h + 7 * 4.5) % 360}, ${baseHsl.s}%, ${Math.max(30, Math.min(85, baseHsl.l - 7 * 1.5))}%)`, "--l": "10em", "--m": "73", "--t": "73s", "--r1": "reverse", "--s": "0.8912721893491125" } as React.CSSProperties} className="wheel">
          <div style={{ "--a": "0deg", "--i": "0" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "4deg", "--i": "1", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "9deg", "--i": "2", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "14deg", "--i": "3" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "19deg", "--i": "4" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "24deg", "--i": "5" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "29deg", "--i": "6" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "34deg", "--i": "7" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "39deg", "--i": "8", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "44deg", "--i": "9", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "49deg", "--i": "10" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "54deg", "--i": "11" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "59deg", "--i": "12", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "64deg", "--i": "13" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "69deg", "--i": "14", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "73deg", "--i": "15" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "78deg", "--i": "16", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "83deg", "--i": "17" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "88deg", "--i": "18" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "93deg", "--i": "19" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "113deg", "--i": "23" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "118deg", "--i": "24" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "123deg", "--i": "25", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "128deg", "--i": "26" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "133deg", "--i": "27" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "147deg", "--i": "30", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "152deg", "--i": "31" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "157deg", "--i": "32" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "162deg", "--i": "33", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "167deg", "--i": "34" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "172deg", "--i": "35" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "187deg", "--i": "38", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "192deg", "--i": "39" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "197deg", "--i": "40" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "202deg", "--i": "41" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "212deg", "--i": "43" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "221deg", "--i": "45", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "236deg", "--i": "48" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "241deg", "--i": "49" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "246deg", "--i": "50", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "256deg", "--i": "52", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "261deg", "--i": "53" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "276deg", "--i": "56", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "281deg", "--i": "57", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "286deg", "--i": "58" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "290deg", "--i": "59", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "295deg", "--i": "60" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "300deg", "--i": "61" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "310deg", "--i": "63", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "315deg", "--i": "64", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "320deg", "--i": "65" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "325deg", "--i": "66", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "335deg", "--i": "68" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "340deg", "--i": "69" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "350deg", "--i": "71", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "355deg", "--i": "72", "--r": "reverse" } as React.CSSProperties} className="number"></div>
        </div>
        <div style={{ color: `hsl(${(baseHsl.h + 8 * 4.5) % 360}, ${baseHsl.s}%, ${Math.max(30, Math.min(85, baseHsl.l - 8 * 1.5))}%)`, "--l": "11em", "--m": "81", "--t": "81s", "--r1": "reverse", "--s": "0.8579881656804733" } as React.CSSProperties} className="wheel">
          <div style={{ "--a": "0deg", "--i": "0" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "4deg", "--i": "1" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "8deg", "--i": "2", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "13deg", "--i": "3" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "22deg", "--i": "5" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "26deg", "--i": "6", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "31deg", "--i": "7", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "35deg", "--i": "8" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "40deg", "--i": "9", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "44deg", "--i": "10" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "48deg", "--i": "11", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "53deg", "--i": "12" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "62deg", "--i": "14", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "66deg", "--i": "15", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "71deg", "--i": "16", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "75deg", "--i": "17", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "80deg", "--i": "18", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "84deg", "--i": "19" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "93deg", "--i": "21" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "97deg", "--i": "22" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "102deg", "--i": "23" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "106deg", "--i": "24", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "111deg", "--i": "25" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "115deg", "--i": "26" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "119deg", "--i": "27" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "124deg", "--i": "28" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "128deg", "--i": "29", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "137deg", "--i": "31", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "142deg", "--i": "32" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "146deg", "--i": "33", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "151deg", "--i": "34" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "155deg", "--i": "35" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "160deg", "--i": "36" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "164deg", "--i": "37" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "168deg", "--i": "38" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "173deg", "--i": "39" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "177deg", "--i": "40", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "182deg", "--i": "41", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "200deg", "--i": "45" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "208deg", "--i": "47", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "217deg", "--i": "49" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "222deg", "--i": "50" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "226deg", "--i": "51" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "231deg", "--i": "52", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "235deg", "--i": "53" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "239deg", "--i": "54", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "244deg", "--i": "55" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "248deg", "--i": "56" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "257deg", "--i": "58" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "262deg", "--i": "59" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "266deg", "--i": "60", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "271deg", "--i": "61" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "284deg", "--i": "64", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "297deg", "--i": "67" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "302deg", "--i": "68" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "306deg", "--i": "69", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "311deg", "--i": "70", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "315deg", "--i": "71" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "320deg", "--i": "72", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "324deg", "--i": "73" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "328deg", "--i": "74", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "333deg", "--i": "75", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "337deg", "--i": "76" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "342deg", "--i": "77", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "346deg", "--i": "78", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "351deg", "--i": "79", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "355deg", "--i": "80" } as React.CSSProperties} className="number"></div>
        </div>
        <div style={{ color: `hsl(${(baseHsl.h + 9 * 4.5) % 360}, ${baseHsl.s}%, ${Math.max(30, Math.min(85, baseHsl.l - 9 * 1.5))}%)`, "--l": "12em", "--m": "88", "--t": "88s", "--r1": "normal", "--s": "0.8202662721893491" } as React.CSSProperties} className="wheel">
          <div style={{ "--a": "8deg", "--i": "2", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "12deg", "--i": "3", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "16deg", "--i": "4" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "20deg", "--i": "5", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "24deg", "--i": "6", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "28deg", "--i": "7" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "32deg", "--i": "8", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "36deg", "--i": "9" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "40deg", "--i": "10", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "45deg", "--i": "11" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "49deg", "--i": "12" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "53deg", "--i": "13", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "69deg", "--i": "17" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "73deg", "--i": "18" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "77deg", "--i": "19" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "81deg", "--i": "20" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "90deg", "--i": "22", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "94deg", "--i": "23", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "98deg", "--i": "24" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "102deg", "--i": "25" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "106deg", "--i": "26" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "114deg", "--i": "28" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "118deg", "--i": "29", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "135deg", "--i": "33" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "139deg", "--i": "34" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "143deg", "--i": "35", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "147deg", "--i": "36", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "155deg", "--i": "38" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "163deg", "--i": "40" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "171deg", "--i": "42" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "175deg", "--i": "43", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "180deg", "--i": "44" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "192deg", "--i": "47", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "196deg", "--i": "48", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "200deg", "--i": "49", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "204deg", "--i": "50" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "208deg", "--i": "51", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "216deg", "--i": "53" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "225deg", "--i": "55", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "229deg", "--i": "56" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "233deg", "--i": "57" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "241deg", "--i": "59" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "245deg", "--i": "60", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "249deg", "--i": "61" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "261deg", "--i": "64", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "270deg", "--i": "66" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "274deg", "--i": "67" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "278deg", "--i": "68", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "282deg", "--i": "69", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "290deg", "--i": "71" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "302deg", "--i": "74" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "310deg", "--i": "76" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "319deg", "--i": "78", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "323deg", "--i": "79", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "327deg", "--i": "80" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "331deg", "--i": "81" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "335deg", "--i": "82", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "339deg", "--i": "83", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "347deg", "--i": "85" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "351deg", "--i": "86", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "355deg", "--i": "87", "--r": "reverse" } as React.CSSProperties} className="number"></div>
        </div>
        <div style={{ color: `hsl(${(baseHsl.h + 10 * 4.5) % 360}, ${baseHsl.s}%, ${Math.max(30, Math.min(85, baseHsl.l - 10 * 1.5))}%)`, "--l": "13em", "--m": "96", "--t": "96s", "--r1": "reverse", "--s": "0.7781065088757396" } as React.CSSProperties} className="wheel">
          <div style={{ "--a": "11deg", "--i": "3", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "14deg", "--i": "4" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "18deg", "--i": "5" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "22.5deg", "--i": "6" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "29deg", "--i": "8", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "33deg", "--i": "9", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "37deg", "--i": "10", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "41deg", "--i": "11", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "48deg", "--i": "13" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "67.5deg", "--i": "18" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "71deg", "--i": "19" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "74deg", "--i": "20" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "78deg", "--i": "21", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "82deg", "--i": "22" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "90deg", "--i": "24" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "93deg", "--i": "25" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "97.5deg", "--i": "26" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "112deg", "--i": "30", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "116deg", "--i": "31" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "123deg", "--i": "33", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "127deg", "--i": "34" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "131deg", "--i": "35", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "138deg", "--i": "37" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "142.5deg", "--i": "38" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "157.5deg", "--i": "42" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "161deg", "--i": "43" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "168deg", "--i": "45", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "172deg", "--i": "46", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "176deg", "--i": "47" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "187.5deg", "--i": "50", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "191deg", "--i": "51" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "202deg", "--i": "54", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "206deg", "--i": "55", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "209deg", "--i": "56" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "217deg", "--i": "58" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "221deg", "--i": "59", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "224deg", "--i": "60", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "232.5deg", "--i": "62", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "243deg", "--i": "65", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "247deg", "--i": "66", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "251deg", "--i": "67" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "254deg", "--i": "68", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "258deg", "--i": "69" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "262deg", "--i": "70" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "266deg", "--i": "71" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "270deg", "--i": "72", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "273deg", "--i": "73" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "281deg", "--i": "75" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "285deg", "--i": "76" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "288deg", "--i": "77", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "303deg", "--i": "81" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "307deg", "--i": "82", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "311deg", "--i": "83" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "315deg", "--i": "84", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "318deg", "--i": "85" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "322.5deg", "--i": "86", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "326deg", "--i": "87" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "337deg", "--i": "90" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "341deg", "--i": "91" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "356deg", "--i": "95", "--r": "reverse" } as React.CSSProperties} className="number"></div>
        </div>
        <div style={{ color: `hsl(${(baseHsl.h + 11 * 4.5) % 360}, ${baseHsl.s}%, ${Math.max(30, Math.min(85, baseHsl.l - 11 * 1.5))}%)`, "--l": "14em", "--m": "103", "--t": "103s", "--r1": "normal", "--s": "0.731508875739645" } as React.CSSProperties} className="wheel">
          <div style={{ "--a": "6deg", "--i": "2" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "13deg", "--i": "4" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "17deg", "--i": "5", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "20deg", "--i": "6", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "27deg", "--i": "8" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "31deg", "--i": "9", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "41deg", "--i": "12", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "48deg", "--i": "14" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "52deg", "--i": "15" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "59deg", "--i": "17", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "62deg", "--i": "18", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "73deg", "--i": "21" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "76deg", "--i": "22" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "80deg", "--i": "23" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "83deg", "--i": "24" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "87deg", "--i": "25", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "90deg", "--i": "26" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "94deg", "--i": "27" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "97deg", "--i": "28" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "111deg", "--i": "32" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "118deg", "--i": "34" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "122deg", "--i": "35" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "129deg", "--i": "37" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "132deg", "--i": "38" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "136deg", "--i": "39", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "143deg", "--i": "41" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "146deg", "--i": "42" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "157deg", "--i": "45" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "160deg", "--i": "46", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "171deg", "--i": "49" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "181deg", "--i": "52", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "185deg", "--i": "53" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "192deg", "--i": "55" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "199deg", "--i": "57", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "209deg", "--i": "60" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "213deg", "--i": "61" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "216deg", "--i": "62" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "223deg", "--i": "64" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "227deg", "--i": "65" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "234deg", "--i": "67", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "237deg", "--i": "68", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "241deg", "--i": "69" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "244deg", "--i": "70", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "251deg", "--i": "72" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "255deg", "--i": "73" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "258deg", "--i": "74", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "265deg", "--i": "76", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "272deg", "--i": "78" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "279deg", "--i": "80" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "283deg", "--i": "81", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "286deg", "--i": "82", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "307deg", "--i": "88", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "311deg", "--i": "89", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "314deg", "--i": "90", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "318deg", "--i": "91", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "321deg", "--i": "92", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "328deg", "--i": "94" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "342deg", "--i": "98" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "346deg", "--i": "99" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "349deg", "--i": "100", "--r": "reverse" } as React.CSSProperties} className="number"></div>
        </div>
        <div style={{ color: `hsl(${(baseHsl.h + 12 * 4.5) % 360}, ${baseHsl.s}%, ${Math.max(30, Math.min(85, baseHsl.l - 12 * 1.5))}%)`, "--l": "15em", "--m": "110", "--t": "110s", "--r1": "reverse", "--s": "0.680473372781065" } as React.CSSProperties} className="wheel">
          <div style={{ "--a": "6deg", "--i": "2", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "13deg", "--i": "4", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "16deg", "--i": "5" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "22deg", "--i": "7", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "29deg", "--i": "9" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "32deg", "--i": "10" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "36deg", "--i": "11" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "42deg", "--i": "13", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "45deg", "--i": "14", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "52deg", "--i": "16" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "62deg", "--i": "19", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "65deg", "--i": "20", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "72deg", "--i": "22" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "78deg", "--i": "24" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "81deg", "--i": "25" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "85deg", "--i": "26", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "88deg", "--i": "27", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "98deg", "--i": "30", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "104deg", "--i": "32" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "114deg", "--i": "35" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "124deg", "--i": "38" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "130deg", "--i": "40", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "134deg", "--i": "41" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "137deg", "--i": "42", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "140deg", "--i": "43", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "150deg", "--i": "46", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "157deg", "--i": "48" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "160deg", "--i": "49", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "170deg", "--i": "52" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "196deg", "--i": "60", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "199deg", "--i": "61", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "202deg", "--i": "62", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "209deg", "--i": "64", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "212deg", "--i": "65", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "216deg", "--i": "66" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "225deg", "--i": "69" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "232deg", "--i": "71", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "248deg", "--i": "76", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "252deg", "--i": "77" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "258deg", "--i": "79" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "261deg", "--i": "80", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "265deg", "--i": "81", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "268deg", "--i": "82" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "274deg", "--i": "84", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "291deg", "--i": "89" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "304deg", "--i": "93" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "317deg", "--i": "97", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "320deg", "--i": "98", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "327deg", "--i": "100", "--r": "reverse" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "333deg", "--i": "102" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "340deg", "--i": "104" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "350deg", "--i": "107" } as React.CSSProperties} className="number"></div>
          <div style={{ "--a": "356deg", "--i": "109" } as React.CSSProperties} className="number"></div>
        </div>
      </div>

      {message && (
        <div style={{
          fontFamily: "'Rajdhani', sans-serif",
          fontSize: '14px',
          color: tokens.textSecondary,
          letterSpacing: '1.5px',
          fontWeight: 600,
          textTransform: 'uppercase',
          marginTop: '10px'
        }}>
          {message}
        </div>
      )}
    </div>
  );
}