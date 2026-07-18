import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';
import { useTheme } from '../../context/ThemeContext';

type QuickContact = {
  name: string;
  phone: string;
};

export default function WhatsAppDirect(props?: any) {
  const { tokens } = useTheme();
  const location = useLocation();
  
  // Persistent login details
  const [phone, setPhone] = useState(() => localStorage.getItem('wa_saved_phone') || '');
  const [message, setMessage] = useState(() => localStorage.getItem('wa_saved_message') || '');
  const [remember, setRemember] = useState(() => localStorage.getItem('wa_remember') === 'true');
  
  // Quick Contacts dictionary
  const [contacts, setContacts] = useState<QuickContact[]>(() => {
    const saved = localStorage.getItem('wa_contacts');
    return saved ? JSON.parse(saved) : [
      { name: 'Self', phone: '+919999999999' },
      { name: 'Support', phone: '+918888888888' }
    ];
  });
  
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [showAddContact, setShowAddContact] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync inputs
  useEffect(() => {
    if (remember) {
      localStorage.setItem('wa_saved_phone', phone);
      localStorage.setItem('wa_saved_message', message);
    } else {
      localStorage.removeItem('wa_saved_phone');
      localStorage.removeItem('wa_saved_message');
    }
    localStorage.setItem('wa_remember', String(remember));
  }, [phone, message, remember]);

  // Sync contacts database
  useEffect(() => {
    localStorage.setItem('wa_contacts', JSON.stringify(contacts));
  }, [contacts]);

  // Support parameter loading on mount for auto-sending
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let data = null;
        if (props && (props.params || props.aiPayload)) {
          data = props.params || props.aiPayload;
        } else if (location.state && (location.state.aiPayload || location.state.params)) {
          data = location.state.aiPayload || location.state.params;
        } else if (props && Object.keys(props).some(k => k !== 'standalone')) {
          data = props;
        }
    
    const pPhone = (data?.phoneNumber || data?.phone || params.get('phone')) ?? '';
    const pMsg = (data?.message || data?.msg || params.get('message') || params.get('msg')) ?? '';
    
    if (pPhone) {
      setPhone(String(pPhone));
      if (pMsg) setMessage(String(pMsg));
      // Auto-send trigger
      const timer = setTimeout(() => {
        let cleaned = String(pPhone).replace(/[^\d+]/g, '');
        const url = `https://wa.me/${cleaned}?text=${encodeURIComponent(String(pMsg || ''))}`;
        window.open(url, '_blank');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  const send = () => {
    setError(null);
    let targetNumber = phone.trim();

    // If a saved name is typed instead of a number, resolve it!
    const matchedContact = contacts.find(c => c.name.toLowerCase() === targetNumber.toLowerCase());
    if (matchedContact) {
      targetNumber = matchedContact.phone;
    }

    let cleaned = targetNumber.replace(/[^\d+]/g, '');
    
    if (!cleaned) {
      setError("Please enter a phone number or a saved contact name.");
      return;
    }

    // Direct WhatsApp link
    const url = `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Contacts Picker API for mobile
  const selectMobileContact = async () => {
    const nav = navigator as any;
    if (nav.contacts && nav.contacts.select) {
      try {
        const picked = await nav.contacts.select(['name', 'tel'], { multiple: false });
        if (picked && picked.length > 0) {
          const c = picked[0];
          const tel = c.tel && c.tel.length > 0 ? c.tel[0] : '';
          const name = c.name && c.name.length > 0 ? c.name[0] : '';
          if (tel) {
            setPhone(tel);
            if (name) {
              // Auto-save to quick contacts list if not present
              if (!contacts.some(item => item.name.toLowerCase() === name.toLowerCase())) {
                setContacts(prev => [...prev, { name, phone: tel }]);
              }
            }
          }
        }
      } catch (err) {
        console.error("Contacts picker error:", err);
      }
    } else {
      alert("Mobile Contacts Picker API is not supported on this browser/desktop. Please use local quick contacts below.");
    }
  };

  const addLocalContact = () => {
    if (!newName.trim() || !newPhone.trim()) {
      alert("Please enter both name and phone number.");
      return;
    }
    setContacts(prev => [...prev, { name: newName.trim(), phone: newPhone.trim() }]);
    setNewName('');
    setNewPhone('');
    setShowAddContact(false);
  };

  const removeContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const templates = [
    "Hello! How are you?",
    "I'm interested in your services.",
    "Can we schedule a call?",
    "Sending you the documents now."
  ];

  return (
    <ToolWrapper toolName="WhatsApp Direct">
      <div style={styles.container}>
        <div style={{ ...styles.card, background: tokens.surface, borderColor: tokens.border }}>
          
          <div style={styles.field}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ ...styles.label, color: tokens.textSecondary }}>Phone Number or Saved Name</label>
              {'contacts' in navigator && (
                <button onClick={selectMobileContact} style={{ ...styles.contactsLink, color: tokens.accent }}>
                  👤 Import Contact
                </button>
              )}
            </div>
            <input
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="e.g. +919876543210 or Self"
              style={{ ...styles.input, background: tokens.inputBg, color: tokens.textPrimary, borderColor: tokens.border }}
            />
          </div>

          <div style={styles.field}>
            <label style={{ ...styles.label, color: tokens.textSecondary }}>Message</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Type your message..."
              style={{ ...styles.textarea, background: tokens.inputBg, color: tokens.textPrimary, borderColor: tokens.border }}
            />
          </div>

          <div style={styles.rememberRow}>
            <input 
              type="checkbox" 
              id="remember" 
              checked={remember} 
              onChange={e => setRemember(e.target.checked)} 
              style={styles.checkbox}
            />
            <label htmlFor="remember" style={{ color: tokens.textPrimary, fontSize: '13px', cursor: 'pointer' }}>
              Remember details (Stay logged in)
            </label>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <motion.button 
            onClick={send} 
            style={styles.sendBtn}
            whileTap={{ scale: 0.97 }}
          >
            Open in WhatsApp
          </motion.button>
        </div>

        {/* Local Contacts Directory */}
        <div style={{ ...styles.card, background: tokens.surface, borderColor: tokens.border }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ ...styles.label, color: tokens.textSecondary }}>Quick Contacts List</span>
            <button 
              onClick={() => setShowAddContact(!showAddContact)} 
              style={{ ...styles.addContactBtn, color: tokens.accent }}
            >
              {showAddContact ? 'Cancel' : '+ Add Contact'}
            </button>
          </div>

          <AnimatePresence>
            {showAddContact && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: 'auto', opacity: 1 }} 
                exit={{ height: 0, opacity: 0 }}
                style={styles.addContactForm}
              >
                <input 
                  type="text" placeholder="Contact Name" value={newName} onChange={e => setNewName(e.target.value)}
                  style={{ ...styles.miniInput, background: tokens.inputBg, color: tokens.textPrimary, borderColor: tokens.border }}
                />
                <input 
                  type="tel" placeholder="Phone Number" value={newPhone} onChange={e => setNewPhone(e.target.value)}
                  style={{ ...styles.miniInput, background: tokens.inputBg, color: tokens.textPrimary, borderColor: tokens.border }}
                />
                <button onClick={addLocalContact} style={{ ...styles.miniBtn, background: tokens.accent }}>Save</button>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={styles.contactsGrid}>
            {contacts.map((c, i) => (
              <div 
                key={i} 
                onClick={() => setPhone(c.name)}
                style={{ 
                  ...styles.contactBadge, 
                  background: phone.toLowerCase() === c.name.toLowerCase() ? `${tokens.accent}20` : tokens.inputBg,
                  borderColor: phone.toLowerCase() === c.name.toLowerCase() ? tokens.accent : tokens.border
                }}
              >
                <div style={styles.contactDetails}>
                  <div style={{ ...styles.contactName, color: tokens.textPrimary }}>{c.name}</div>
                  <div style={{ ...styles.contactPhone, color: tokens.textSecondary }}>{c.phone}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); removeContact(i); }} style={styles.deleteContact}>×</button>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.templates}>
          <div style={{ ...styles.templateHeader, color: tokens.textSecondary }}>Quick Templates</div>
          <div style={styles.templateList}>
            {templates.map(t => (
              <button 
                key={t} 
                onClick={() => setMessage(t)} 
                style={{ ...styles.templateBtn, background: tokens.surface, borderColor: tokens.border, color: tokens.textPrimary }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <p style={{ ...styles.hint, color: tokens.textSecondary }}>
          No need to save numbers in your phonebook. Manage local quick contacts or type names directly.
        </p>
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '440px', margin: '0 auto', padding: '10px' },
  card: { border: '1px solid', borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' },
  field: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: {
    border: '1px solid', borderRadius: '12px',
    fontSize: '16px', padding: '14px', outline: 'none'
  },
  textarea: {
    border: '1px solid', borderRadius: '12px',
    fontSize: '15px', padding: '14px', outline: 'none', height: '90px', resize: 'none'
  },
  rememberRow: { display: 'flex', alignItems: 'center', gap: '8px' },
  checkbox: { width: '16px', height: '16px', cursor: 'pointer' },
  sendBtn: {
    background: '#25D366', border: 'none', borderRadius: '12px', color: '#fff',
    fontWeight: 'bold', padding: '16px', cursor: 'pointer', fontSize: '16px', boxShadow: '0 4px 12px rgba(37, 211, 102, 0.25)'
  },
  contactsLink: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' },
  addContactBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' },
  addContactForm: { display: 'flex', gap: '6px', width: '100%', marginBottom: '8px', overflow: 'hidden' },
  miniInput: { flex: 1, padding: '8px 12px', border: '1px solid', borderRadius: '8px', fontSize: '12px', outline: 'none' },
  miniBtn: { border: 'none', borderRadius: '8px', color: '#fff', padding: '0 14px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' },
  contactsGrid: { display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto', paddingRight: '4px' },
  contactBadge: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', border: '1px solid', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' },
  contactDetails: { display: 'flex', flexDirection: 'column', gap: '2px' },
  contactName: { fontSize: '13px', fontWeight: 'bold' },
  contactPhone: { fontSize: '11px', fontFamily: 'monospace' },
  deleteContact: { background: 'none', border: 'none', color: '#EF4444', fontSize: '18px', cursor: 'pointer', padding: '0 4px' },
  templates: { display: 'flex', flexDirection: 'column', gap: '10px' },
  templateHeader: { fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' },
  templateList: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  templateBtn: {
    border: '1px solid', borderRadius: '8px',
    fontSize: '12px', padding: '8px 12px', cursor: 'pointer'
  },
  error: { color: '#EF4444', fontSize: '13px', textAlign: 'center', fontWeight: 'bold' },
  hint: { fontSize: '12px', textAlign: 'center', opacity: 0.6 }
};
