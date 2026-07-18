import React, { useState } from 'react';
// Import the official Google Gen AI library
import { GoogleGenAI } from '@google/genai';

// Initialize the brain using your free API key from Google AI Studio
// Replace 'YOUR_API_KEY' with your actual string key
const ai = new GoogleGenAI({ apiKey: 'YOUR_API_KEY' });

export default function AIOffice() {
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTool, setActiveTool] = useState(null);
  const [toolData, setToolData] = useState({});

  // The master rules for our AI coordinator
  const systemInstruction = `
    You are the intelligent router for 'Toolkit'. Your job is to analyze what the user wants and return a strict JSON object.
    
    If they want to calculate BMI or talk about weight/height fitness, return:
    { "tool": "BMI", "data": { "weight": number_or_null, "height": number_or_null } }
    
    If they want to track periods or ask about cycles, return:
    { "tool": "PERIODS", "data": { "cycleLength": number_or_null } }
    
    If they are just chatting, saying hello, or you don't know, return:
    { "tool": "CHAT", "data": { "reply": "your helpful friendly response here" } }

    CRITICAL: Output ONLY valid raw JSON structure matching these templates.
  `;

  const handleExecute = async (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    setLoading(true);
    try {
      // Calling the fast and free gemini-2.5-flash model
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userInput,
        config: {
          systemInstruction: systemInstruction,
          // This forces Gemini to output pure, parseable JSON without markdown ticks
          responseMimeType: "application/json"
        }
      });

      // Parse the text coming from the AI brain
      const resultJson = JSON.parse(response.text.trim());
      
      // Update our React state to instantly change the workspace view
      setActiveTool(resultJson.tool);
      setToolData(resultJson.data || {});

    } catch (error) {
      console.error("AI Routing failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '25px', fontFamily: 'system-ui, sans-serif', maxWidth: '650px', margin: '40px auto', border: '1px solid #e0e0e0', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
      <h2 style={{ color: '#1a73e8', display: 'flex', alignItems: 'center', gap: '8px' }}>⚡ Toolkit Agent Core</h2>
      <p style={{ color: '#5f6368', fontSize: '14px' }}>
        Type your objective naturally. Try: <i>"I am 72kg and 1.8m tall, check my health"</i>
      </p>
      
      <form onSubmit={handleExecute} style={{ display: 'flex', gap: '10px', margin: '20px 0' }}>
        <input 
          type="text" 
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="What tool do you need, Madan?" 
          style={{ flex: 1, padding: '12px 16px', borderRadius: '8px', border: '1px solid #dadce0', fontSize: '16px', outline: 'none' }}
        />
        <button 
          type="submit" 
          disabled={loading} 
          style={{ padding: '12px 24px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }}
        >
          {loading ? 'Routing...' : 'Run Engine'}
        </button>
      </form>

      {/* The Dynamic Workspace Window */}
      <div style={{ marginTop: '24px', padding: '20px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e8eaed' }}>
        <span style={{ fontSize: '11px', textTransform: 'uppercase', tracking: '1px', color: '#80868b', fontWeight: 'bold' }}>Active Workspace Layer</span>
        
        <div style={{ marginTop: '12px' }}>
          {activeTool === 'CHAT' && (
            <p style={{ lineHeight: '1.5', color: '#202124' }}>🤖 {toolData.reply}</p>
          )}

          {activeTool === 'BMI' && (
            <div>
              <h4 style={{ margin: '0 0 10px 0', color: '#137333' }}>📊 Micro-Tool Linked: BMI Calculator</h4>
              <p style={{ fontSize: '13px', color: '#5f6368' }}>Variables successfully extracted by Agent Core:</p>
              <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                <label style={{ fontSize: '14px' }}>
                  Weight (kg): <input type="number" defaultValue={toolData.weight || ''} style={{ padding: '6px', width: '70px', borderRadius: '4px', border: '1px solid #dadce0' }} />
                </label>
                <label style={{ fontSize: '14px' }}>
                  Height (m): <input type="number" defaultValue={toolData.height || ''} style={{ padding: '6px', width: '70px', borderRadius: '4px', border: '1px solid #dadce0' }} />
                </label>
              </div>
            </div>
          )}

          {activeTool === 'PERIODS' && (
            <div>
              <h4 style={{ margin: '0 0 10px 0', color: '#b06000' }}>🩸 Micro-Tool Linked: Period Tracker</h4>
              <label style={{ fontSize: '14px' }}>
                Cycle Duration: <input type="number" defaultValue={toolData.cycleLength || 28} style={{ padding: '6px', width: '70px', borderRadius: '4px', border: '1px solid #dadce0' }} /> Days
              </label>
            </div>
          )}

          {!activeTool && <p style={{ color: '#9aa0a6', fontStyle: 'italic' }}>Awaiting structural input intent...</p>}
        </div>
      </div>
    </div>
  );
}