import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

export default function BackButton() {
  const navigate = useNavigate();
  const { theme } = useTheme();

  // Theme-specific colors for the blob back button
  const blobThemes: Record<string, { color: string; hoverColor: string }> = {
    dark: { color: '#fffdd0', hoverColor: '#0c0c0c' },
    'neon-dark': { color: '#21F1A8', hoverColor: '#171717' },
    'plum-rose': { color: '#E9C1B7', hoverColor: '#6B3557' },
    'olive-lime': { color: '#E4FD97', hoverColor: '#2D3E2C' },
    light: { color: '#0505A9', hoverColor: '#FFFFFF' }
  };

  const currentTheme = blobThemes[theme] || blobThemes.dark;
  const accentColor = currentTheme.color;
  const hoverTextColor = currentTheme.hoverColor;

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <style>{`
        .back-blob-btn {
          z-index: 1;
          position: relative;
          padding: 8px 20px;
          text-align: center;
          text-transform: uppercase;
          color: ${accentColor};
          font-size: 12px;
          font-weight: 800;
          background-color: transparent;
          outline: none;
          border: none;
          transition: color 0.5s;
          cursor: pointer;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-family: 'Orbitron', sans-serif;
          letter-spacing: 0.5px;
          min-height: 36px;
        }
        .back-blob-btn:before {
          content: "";
          z-index: 1;
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          border: 2px solid ${accentColor};
          border-radius: 12px;
        }
        .back-blob-btn:hover {
          color: ${hoverTextColor};
        }
        .back-blob-btn__inner {
          z-index: -1;
          overflow: hidden;
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          border-radius: 12px;
          background: transparent;
        }
        .back-blob-btn__blobs {
          position: relative;
          display: block;
          height: 100%;
          filter: url("#goo-back");
        }
        .back-blob-btn__blob {
          position: absolute;
          top: 2px;
          width: 25%;
          height: 100%;
          background: ${accentColor};
          border-radius: 100%;
          transform: translate3d(0, 150%, 0) scale(1.7);
          transition: transform 0.45s;
        }
        @supports (filter: url("#goo-back")) {
          .back-blob-btn__blob {
            transform: translate3d(0, 150%, 0) scale(1.4);
          }
        }
        .back-blob-btn__blob:nth-child(1) {
          left: 0%;
          transition-delay: 0s;
        }
        .back-blob-btn__blob:nth-child(2) {
          left: 30%;
          transition-delay: 0.08s;
        }
        .back-blob-btn__blob:nth-child(3) {
          left: 60%;
          transition-delay: 0.16s;
        }
        .back-blob-btn__blob:nth-child(4) {
          left: 90%;
          transition-delay: 0.24s;
        }
        .back-blob-btn:hover .back-blob-btn__blob {
          transform: translateZ(0) scale(1.7);
        }
        @supports (filter: url("#goo-back")) {
          .back-blob-btn:hover .back-blob-btn__blob {
            transform: translateZ(0) scale(1.4);
          }
        }
      `}</style>

      {/* Hidden SVG Filter definition for blob effect */}
      <svg xmlns="http://www.w3.org/2000/svg" version="1.1" style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <filter id="goo-back">
            <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="6" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
            <feBlend in2="goo" in="SourceGraphic" result="mix" />
          </filter>
        </defs>
      </svg>

      <button className="back-blob-btn" onClick={handleBack}>
        ‹ Back
        <span className="back-blob-btn__inner">
          <span className="back-blob-btn__blobs">
            <span className="back-blob-btn__blob"></span>
            <span className="back-blob-btn__blob"></span>
            <span className="back-blob-btn__blob"></span>
            <span className="back-blob-btn__blob"></span>
          </span>
        </span>
      </button>
    </div>
  );
}