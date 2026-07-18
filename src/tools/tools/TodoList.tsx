import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  collection, addDoc, deleteDoc, updateDoc, doc, 
  onSnapshot, query, orderBy, serverTimestamp, writeBatch 
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import ToolWrapper from '../../components/ToolWrapper';

type Todo = {
  id: string;
  text: string;
  done: boolean;
  category: string;
  createdAt: any;
};

const CATEGORIES = ['General', 'Work', 'Personal', 'Urgent'];

export default function TodoList(props?: any) {
  const { currentUser } = useAuth();
  const location = useLocation();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState('');
  const [category, setCategory] = useState('General');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Prefill from chatbot navigation state
  useEffect(() => {
    const data = props?.params || props?.aiPayload || location.state?.aiPayload || location.state?.params;
    if (data) {
      if (data.task || data.text || data.item) setInput(String(data.task || data.text || data.item));
      if (data.category && CATEGORIES.includes(String(data.category))) setCategory(String(data.category));
    }
  }, [location.state]);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'todos', currentUser.uid, 'items'),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Todo[];
      setTodos(items);
      setLoading(false);
    }, (err) => {
      setError("Sync failed. Check your connection.");
      setLoading(false);
    });

    return () => unsub();
  }, [currentUser]);

  const addTask = async () => {
    if (!input.trim() || !currentUser) return;
    try {
      await addDoc(collection(db, 'todos', currentUser.uid, 'items'), {
        text: input.trim(),
        done: false,
        category,
        createdAt: serverTimestamp()
      });
      setInput('');
    } catch (e) {
      setError("Failed to add task.");
    }
  };

  const toggleTask = async (id: string, done: boolean) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'todos', currentUser.uid, 'items', id), { done: !done });
    } catch (e) {}
  };

  const deleteTask = async (id: string) => {
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, 'todos', currentUser.uid, 'items', id));
    } catch (e) {}
  };

  const clearCompleted = async () => {
    if (!currentUser) return;
    const completed = todos.filter(t => t.done);
    const batch = writeBatch(db);
    completed.forEach(t => {
      batch.delete(doc(db, 'todos', currentUser.uid, 'items', t.id));
    });
    await batch.commit();
  };

  const filtered = todos.filter(t => {
    if (filter === 'active') return !t.done;
    if (filter === 'done') return t.done;
    return true;
  });

  if (!currentUser) {
    return (
      <ToolWrapper toolName="To-Do List">
        <div style={styles.authMsg}>Please sign in to manage your tasks across devices.</div>
      </ToolWrapper>
    );
  }

  return (
    <ToolWrapper toolName="To-Do List">
      <div style={styles.container}>
        <div style={styles.inputCard}>
          <div style={styles.inputRow}>
            <input 
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTask()}
              placeholder="What needs to be done?" style={styles.input}
            />
            <motion.button onClick={addTask} style={styles.addBtn} whileTap={{ scale: 0.9 }}>
              +
            </motion.button>
          </div>
          <div style={styles.catRow}>
            {CATEGORIES.map(c => (
              <button 
                key={c} onClick={() => setCategory(c)}
                style={{ ...styles.catTag, background: category === c ? 'var(--color-accent)' : 'var(--color-bg-elevated)' }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.filterBar}>
          <div style={styles.filterTabs}>
            {['all', 'active', 'done'].map(f => (
              <button 
                key={f} onClick={() => setFilter(f)}
                style={{ ...styles.tab, color: filter === f ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
          {todos.some(t => t.done) && (
            <button onClick={clearCompleted} style={styles.clearBtn}>Clear Done</button>
          )}
        </div>

        <div style={styles.list}>
          <AnimatePresence mode="popLayout">
            {filtered.map(todo => (
              <motion.div 
                key={todo.id} layout
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                style={{ ...styles.item, borderColor: todo.done ? 'var(--color-border)' : 'var(--color-accent)' }}
              >
                <button onClick={() => toggleTask(todo.id, todo.done)} style={styles.check}>
                  {todo.done && '✓'}
                </button>
                <div style={styles.itemContent}>
                  <span style={{ ...styles.text, textDecoration: todo.done ? 'line-through' : 'none', opacity: todo.done ? 0.5 : 1 }}>
                    {todo.text}
                  </span>
                  <span style={styles.itemCat}>{todo.category}</span>
                </div>
                <button onClick={() => deleteTask(todo.id)} style={styles.delete}>×</button>
              </motion.div>
            ))}
          </AnimatePresence>
          {!loading && filtered.length === 0 && (
            <div style={styles.empty}>No tasks found. Time to relax!</div>
          )}
        </div>
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '560px', margin: '0 auto', padding: '20px' },
  authMsg: { textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' },
  inputCard: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' },
  inputRow: { display: 'flex', gap: '10px' },
  input: { flex: 1, background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '12px', color: '#fff', padding: '14px', fontSize: '16px', outline: 'none' },
  addBtn: { width: '52px', height: '52px', background: 'var(--color-accent)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '24px', cursor: 'pointer' },
  catRow: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  catTag: { padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', color: '#fff', border: '1px solid var(--color-border)', cursor: 'pointer' },
  filterBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 10px' },
  filterTabs: { display: 'flex', gap: '16px' },
  tab: { background: 'none', border: 'none', fontSize: '11px', fontWeight: '900', cursor: 'pointer', letterSpacing: '1px' },
  clearBtn: { background: 'none', border: 'none', fontSize: '11px', color: '#EF4444', fontWeight: 'bold', cursor: 'pointer' },
  list: { display: 'flex', flexDirection: 'column', gap: '10px' },
  item: { background: 'var(--color-bg-surface)', border: '1px solid', borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' },
  check: { width: '24px', height: '24px', borderRadius: '6px', border: '2px solid var(--color-accent)', background: 'none', color: 'var(--color-accent)', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  itemContent: { flex: 1, display: 'flex', flexDirection: 'column' },
  text: { fontSize: '16px', color: '#fff' },
  itemCat: { fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginTop: '2px' },
  delete: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', fontSize: '20px', cursor: 'pointer' },
  empty: { textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)', fontSize: '14px' }
};
