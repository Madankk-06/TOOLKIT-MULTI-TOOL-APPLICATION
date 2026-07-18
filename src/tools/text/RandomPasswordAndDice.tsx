import React, { useState } from 'react';
import PasswordGenerator from './PasswordGenerator';
import DiceRoller from './DiceRoller';
import ToolWrapper from '../../components/ToolWrapper';

export default function RandomPasswordAndDice() {
  const [tab, setTab] = useState<'password' | 'dice'>('password');

  return (
    <ToolWrapper toolName="Randomizer Studio">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '10px' }}>
          <button
            onClick={() => setTab('password')}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              background: tab === 'password' ? 'linear-gradient(135deg, #6C63FF, #8B5CF6)' : 'rgba(255,255,255,0.06)',
              color: '#fff',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: tab === 'password' ? '0 4px 15px rgba(108,99,255,0.3)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            Password Generator
          </button>
          <button
            onClick={() => setTab('dice')}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              background: tab === 'dice' ? 'linear-gradient(135deg, #6C63FF, #8B5CF6)' : 'rgba(255,255,255,0.06)',
              color: '#fff',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: tab === 'dice' ? '0 4px 15px rgba(108,99,255,0.3)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            Dice Roller
          </button>
        </div>
        {tab === 'password' ? (
          <PasswordGenerator standalone={false} />
        ) : (
          <DiceRoller standalone={false} />
        )}
      </div>
    </ToolWrapper>
  );
}
