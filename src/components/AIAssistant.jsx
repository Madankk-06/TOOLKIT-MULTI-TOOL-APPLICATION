import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AIService } from '../services/AIService';

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am your AI Toolkit Assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const response = await AIService.ask(userMsg, "You are a helpful assistant for 'ToolKit Pro', an all-in-one web application with various tools like calculators, translators, health trackers, and games. Help the user find tools or answer their general questions. Keep responses concise and professional.");
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Error: " + (error.message || "Something went wrong.") }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        style={styles.toggleBtn}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        {isOpen ? '✕' : '✨'}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            style={styles.window}
          >
            <div style={styles.header}>
              <div style={styles.headerTitle}>AI Assistant</div>
              <div style={styles.status}>Online</div>
            </div>
            <div style={styles.chatArea} ref={scrollRef}>
              {messages.map((m, i) => (
                <div key={i} style={{
                  ...styles.msgBubble,
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  background: m.role === 'user' ? 'var(--accent-cyan-dim)' : 'var(--bg-input)',
                  border: m.role === 'user' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-input)',
                }}>
                  {m.content}
                </div>
              ))}
              {loading && <div style={styles.loading}>Thinking...</div>}
            </div>

            <div style={styles.inputArea}>
              <input
                style={styles.input}
                placeholder="Ask me anything..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
              />
              <button style={styles.sendBtn} onClick={handleSend} disabled={loading}>
                {loading ? '...' : '➤'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const styles = {
  toggleBtn: {
    position: 'fixed', bottom: '30px', right: '30px',
    width: '60px', height: '60px', borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--accent-pink), var(--accent-cyan))',
    border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer',
    boxShadow: '0 8px 32px rgba(233,30,140,0.4)', zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  window: {
    position: 'fixed', bottom: '100px', right: '30px',
    width: '350px', height: '500px', background: 'var(--bg-nav)',
    backdropFilter: 'blur(20px)', border: '1px solid var(--border-card)',
    borderRadius: '24px', boxShadow: '0 20px 48px rgba(0,0,0,0.5)',
    zIndex: 1000, display: 'flex', flexDirection: 'column', overflow: 'hidden'
  },
  header: {
    padding: '16px 20px', borderBottom: '1px solid var(--border-card)',
    background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  },
  headerTitle: { fontFamily: "'Orbitron', sans-serif", fontSize: '14px', fontWeight: '800', color: 'var(--accent-gold)' },
  status: { fontSize: '11px', color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: '1px' },
  chatArea: {
    flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px'
  },
  msgBubble: {
    maxWidth: '85%', padding: '10px 14px', borderRadius: '16px',
    fontSize: '14px', fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.5, color: 'var(--text-primary)'
  },
  loading: { fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' },
  inputArea: {
    padding: '16px', borderTop: '1px solid var(--border-card)', display: 'flex', gap: '8px'
  },
  input: {
    flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border-input)',
    borderRadius: '12px', padding: '10px 14px', color: 'var(--text-primary)',
    fontFamily: "'Space Grotesk', sans-serif", outline: 'none'
  },
  sendBtn: {
    background: 'var(--accent-cyan)', border: 'none', borderRadius: '12px',
    width: '40px', color: '#fff', cursor: 'pointer', transition: '0.2s'
  }
};
