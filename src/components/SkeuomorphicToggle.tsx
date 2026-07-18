import React, { useRef } from 'react';

interface SkeuomorphicToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  uncheckedLabel: string;
  checkedLabel: string;
  size?: number;
}

export default function SkeuomorphicToggle({
  checked,
  onChange,
  uncheckedLabel,
  checkedLabel,
  size = 140,
}: SkeuomorphicToggleProps) {
  const toggleIdRef = useRef(`skeuo-toggle-${Math.random().toString(36).slice(2, 9)}`);

  return (
    <div className="skeuo-toggle-wrapper">
      <style>{`
        .skeuo-toggle-container {
          display: inline-block;
          position: relative;
          box-shadow: inset 0 0 35px 5px rgba(0, 0, 0, 0.25), 
                      inset 0 2px 1px 1px rgba(255, 255, 255, 0.9), 
                      inset 0 -2px 1px 0 rgba(0, 0, 0, 0.25);
          border-radius: 8px;
          background: #ccd0d4;
          cursor: pointer;
        }

        .skeuo-toggle-container:before {
          box-shadow: 0 0 17.5px 8.75px #fff;
          border-radius: 50%;
          background: #fff;
          position: absolute;
          opacity: 0.2;
          content: "";
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
        }

        .skeuo-toggle-button {
          filter: blur(0.5px);
          transition: all 300ms cubic-bezier(0.23, 1, 0.32, 1);
          box-shadow: 0 12px 20px -4px rgba(0, 0, 0, 0.5), 
                      inset 0 -3px 4px -1px rgba(0, 0, 0, 0.2), 
                      0 -8px 12px -1px rgba(255, 255, 255, 0.6), 
                      inset 0 3px 4px -1px rgba(255, 255, 255, 0.2), 
                      inset 0 0 5px 1px rgba(255, 255, 255, 0.8), 
                      inset 0 20px 30px 0 rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          position: absolute;
          background: #ccd0d4;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          display: block;
        }

        .skeuo-toggle-label {
          transition: color 300ms ease-out, font-size 200ms ease;
          text-shadow: 1px 1px 3px #ccd0d4, 0 0 0 rgba(0, 0, 0, 0.8), 1px 1px 4px #fff;
          text-align: center;
          position: absolute;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.9;
          height: 100%;
          width: 100%;
          color: rgba(0, 0, 0, 0.42);
          font-family: system-ui, -apple-system, sans-serif;
          user-select: none;
        }

        .skeuo-toggle-container input {
          opacity: 0;
          position: absolute;
          cursor: pointer;
          z-index: 2;
          height: 100%;
          width: 100%;
          left: 0;
          top: 0;
          margin: 0;
        }

        .skeuo-toggle-container input:active ~ .skeuo-toggle-button {
          box-shadow: 0 10px 15px -4px rgba(0, 0, 0, 0.4), 
                      inset 0 -8px 30px 1px rgba(255, 255, 255, 0.9), 
                      0 -6px 10px -1px rgba(255, 255, 255, 0.6), 
                      inset 0 8px 25px 0 rgba(0, 0, 0, 0.4), 
                      inset 0 0 10px 1px rgba(255, 255, 255, 0.6);
        }

        .skeuo-toggle-container input:active ~ .skeuo-toggle-label {
          transform: scale(0.95);
          color: rgba(0, 0, 0, 0.48);
        }

        .skeuo-toggle-container input:checked ~ .skeuo-toggle-button {
          box-shadow: 0 8px 15px -4px rgba(0, 0, 0, 0.4), 
                      inset 0 -8px 25px -1px rgba(255, 255, 255, 0.9), 
                      0 -6px 10px -1px rgba(255, 255, 255, 0.6), 
                      inset 0 8px 20px 0 rgba(0, 0, 0, 0.2), 
                      inset 0 0 5px 1px rgba(255, 255, 255, 0.6);
        }

        .skeuo-toggle-container input:checked ~ .skeuo-toggle-label {
          color: rgba(0, 0, 0, 0.45);
        }
      `}</style>

      <div
        className="skeuo-toggle-container"
        style={{
          width: `${size}px`,
          height: `${size}px`,
        }}
      >
        <input
          type="checkbox"
          id={toggleIdRef.current}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span
          className="skeuo-toggle-button"
          style={{
            width: `${size * 0.68}px`,
            height: `${size * 0.68}px`,
          }}
        />
        <span
          className="skeuo-toggle-label"
          style={{
            fontSize: `${size * 0.3}px`,
          }}
        >
          {checked ? checkedLabel : uncheckedLabel}
        </span>
      </div>
    </div>
  );
}
