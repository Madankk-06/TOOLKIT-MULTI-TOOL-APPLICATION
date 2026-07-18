import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';
import ToolWrapper from '../../components/ToolWrapper';

// Initialize PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

declare global {
  interface Window {
    Tesseract: any;
  }
}

type FilterType = 'none' | 'grayscale' | 'binarized';
type FileType = 'image' | 'pdf' | 'docx' | 'txt' | null;

interface FileMeta {
  name: string;
  size: number;
  type: FileType;
  base64?: string;
}

export default function TextScanner(props?: any) {
  const location = useLocation();
  const [image, setImage] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('grayscale');
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'scanning' | 'done'>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState('');
  const [copied, setCopied] = useState(false);
  const [fileMeta, setFileMeta] = useState<FileMeta | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Tesseract script
  useEffect(() => {
    if (!window.Tesseract) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/4.1.1/tesseract.min.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  // Preprocess image when uploaded or when filter changes
  useEffect(() => {
    if (image && fileMeta?.type === 'image') {
      setStatus('loading');
      preprocessImage(image, filter).then(res => {
        setProcessedImage(res);
        setStatus('idle');
      });
    } else {
      setProcessedImage(null);
    }
  }, [image, filter, fileMeta]);

  // Check for auto-loaded file from chatbot
  useEffect(() => {
    try {
      const pendingData = sessionStorage.getItem('chatbot-pending-file');
      if (pendingData) {
        sessionStorage.removeItem('chatbot-pending-file');
        const parsed = JSON.parse(pendingData);
        if (parsed.isImage) {
          const mime = parsed.type || 'image/png';
          const imgUrl = `data:${mime};base64,${parsed.base64}`;
          setImage(imgUrl);
          setFileMeta({
            name: parsed.name || 'Image from chatbot',
            size: 0,
            type: 'image',
            base64: parsed.base64
          });
          // Auto-trigger OCR once Tesseract loads
          const triggerOCR = () => {
            if (window.Tesseract) {
              startOcr(imgUrl);
            } else {
              setTimeout(triggerOCR, 200);
            }
          };
          triggerOCR();
        } else {
          // Document file
          setFileMeta({
            name: parsed.name || 'Document from chatbot',
            size: 0,
            type: getFileTypeByName(parsed.name),
            base64: parsed.base64
          });
          if (parsed.extractedText) {
            setResult(parsed.extractedText);
            setStatus('done');
          } else if (parsed.base64) {
            // Process doc extraction
            const bin = atob(parsed.base64);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) {
              bytes[i] = bin.charCodeAt(i);
            }
            processDocFile(bytes.buffer, parsed.name);
          }
        }
      }
    } catch (e) {
      console.error('Failed to parse pending chatbot file', e);
    }
  }, []);

  const getFileTypeByName = (name: string): FileType => {
    const ext = name.toLowerCase().split('.').pop();
    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(ext || '')) return 'image';
    if (ext === 'pdf') return 'pdf';
    if (['docx', 'doc'].includes(ext || '')) return 'docx';
    return 'txt';
  };

  const preprocessImage = (imageSrc: string, filterType: FilterType): Promise<string> => {
    return new Promise((resolve) => {
      if (filterType === 'none') {
        resolve(imageSrc);
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageSrc);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // Grayscale & min/max for contrast stretching
        let min = 255;
        let max = 0;
        const grays = new Uint8Array(data.length / 4);

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i+1];
          const b = data[i+2];
          const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
          grays[i / 4] = gray;
          if (gray < min) min = gray;
          if (gray > max) max = gray;
        }

        const range = max - min || 1;
        for (let i = 0; i < data.length; i += 4) {
          let gVal = grays[i / 4];
          // Linear contrast stretch
          gVal = Math.round(((gVal - min) / range) * 255);

          if (filterType === 'binarized') {
            const threshold = 127;
            const finalVal = gVal > threshold ? 255 : 0;
            data[i] = finalVal;
            data[i+1] = finalVal;
            data[i+2] = finalVal;
          } else {
            data[i] = gVal;
            data[i+1] = gVal;
            data[i+2] = gVal;
          }
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL());
      };
      img.onerror = () => resolve(imageSrc);
      img.src = imageSrc;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setResult('');
    setImage(null);
    setProcessedImage(null);

    const type = getFileTypeByName(file.name);
    setFileMeta({
      name: file.name,
      size: file.size,
      type
    });

    if (type === 'image') {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImage(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      const buf = await file.arrayBuffer();
      processDocFile(buf, file.name);
    }
  };

  const processDocFile = async (buf: ArrayBuffer, fileName: string) => {
    setStatus('scanning');
    setProgress(20);
    try {
      let text = '';
      if (fileName.toLowerCase().endsWith('.pdf')) {
        const pdf = await pdfjs.getDocument({ data: buf }).promise;
        setProgress(40);
        const maxPages = pdf.numPages;
        for (let i = 1; i <= maxPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map(it => ('str' in it ? it.str : '')).join(' ') + '\n';
          setProgress(Math.round(40 + (i / maxPages) * 50));
        }
      } else if (fileName.toLowerCase().endsWith('.docx') || fileName.toLowerCase().endsWith('.doc')) {
        setProgress(50);
        const res = await mammoth.extractRawText({ arrayBuffer: buf });
        text = res.value;
      } else {
        // Plain text file
        const decoder = new TextDecoder('utf-8');
        text = decoder.decode(buf);
      }
      
      setProgress(100);
      setResult(text.trim());
      setStatus('done');
    } catch (err) {
      console.error(err);
      setStatus('idle');
      alert('Document text extraction failed. Please check the file format.');
    }
  };

  const startOcr = async (targetImg: string) => {
    if (!targetImg || !window.Tesseract) return;
    setStatus('scanning');
    setProgress(0);
    try {
      const { data: { text } } = await window.Tesseract.recognize(targetImg, 'eng', {
        logger: (m: any) => {
          if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100));
        }
      });
      setResult(text);
      setStatus('done');
    } catch (err) {
      console.error(err);
      setStatus('idle');
      alert('OCR Failed. Please try another image.');
    }
  };

  const triggerImageScan = () => {
    const targetImg = processedImage || image;
    if (targetImg) {
      startOcr(targetImg);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <ToolWrapper toolName="Doc & Image to Text">
      <div style={styles.container}>
        <div 
          style={{ 
            ...styles.dropZone, 
            borderColor: fileMeta ? 'var(--color-accent)' : 'var(--color-border)' 
          }}
          onClick={() => !fileMeta && fileInputRef.current?.click()}
        >
          {processedImage ? (
            <img src={processedImage} alt="Preview" style={styles.preview} />
          ) : fileMeta && fileMeta.type !== 'image' ? (
            <div style={styles.placeholder}>
              <span style={styles.icon}>📄</span>
              <div style={styles.hint}>{fileMeta.name}</div>
              <div style={styles.subHint}>{formatSize(fileMeta.size)}</div>
            </div>
          ) : status === 'loading' ? (
            <div style={styles.placeholder}>
              <div style={styles.spinner}>⚙️</div>
              <div style={styles.hint}>Preprocessing image...</div>
            </div>
          ) : (
            <div style={styles.placeholder}>
              <span style={styles.icon}>📁</span>
              <div style={styles.hint}>Click to upload PDF, Word or Image</div>
              <div style={styles.subHint}>Supports PDF, DOCX, DOC, TXT, JPG, PNG, WEBP</div>
            </div>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*,.pdf,.docx,.doc,.txt" 
            style={{ display: 'none' }} 
          />
        </div>

        {image && fileMeta?.type === 'image' && (
          <div style={styles.filterBar}>
            <span style={styles.filterLabel}>Preprocessing:</span>
            <div style={styles.filterBtns}>
              {(['none', 'grayscale', 'binarized'] as FilterType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  style={{
                    ...styles.filterBtn,
                    ...(filter === t ? styles.filterBtnActive : {})
                  }}
                >
                  {t === 'none' ? 'Original' : t === 'grayscale' ? 'Contrast Gray' : 'B&W Doc'}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={styles.actions}>
          {fileMeta?.type === 'image' && (
            <button 
              onClick={triggerImageScan} 
              disabled={status === 'scanning' || status === 'loading'}
              style={{ ...styles.scanBtn, opacity: (status === 'scanning' || status === 'loading') ? 0.5 : 1 }}
            >
              {status === 'scanning' ? `SCANNING... ${progress}%` : 'EXTRACT TEXT'}
            </button>
          )}

          {status === 'scanning' && fileMeta?.type !== 'image' && (
            <div style={{ ...styles.scanBtn, display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: 0.8 }}>
              EXTRACTING TEXT... {progress}%
            </div>
          )}
          
          {fileMeta && (
            <button onClick={() => { setImage(null); setProcessedImage(null); setResult(''); setFileMeta(null); setStatus('idle'); }} style={styles.clearBtn}>
              CLEAR
            </button>
          )}
        </div>

        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={styles.resultArea}>
              <div style={styles.resHeader}>
                <span>EXTRACTED CONTENT</span>
                <button onClick={copy} style={styles.copyBtn}>
                  {copied ? '✓ COPIED' : 'COPY ALL'}
                </button>
              </div>
              <textarea 
                readOnly 
                value={result} 
                style={styles.resText}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: '24px', padding: '20px', maxWidth: '600px', margin: '0 auto', color: 'var(--color-text-main)' },
  dropZone: { background: 'var(--color-bg-surface)', border: '2px dashed', borderRadius: '32px', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', transition: 'all 0.2s' },
  preview: { maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' },
  placeholder: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center', padding: '20px' },
  icon: { fontSize: '48px' },
  spinner: { fontSize: '48px', animation: 'spin 2s linear infinite' },
  hint: { fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text-main)', wordBreak: 'break-all' },
  subHint: { fontSize: '12px', color: 'var(--color-text-muted)' },
  
  filterBar: { display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '20px', padding: '16px' },
  filterLabel: { fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' },
  filterBtns: { display: 'flex', gap: '8px' },
  filterBtn: { flex: 1, background: 'var(--color-bg-elevated, #2D3748)', border: '1px solid var(--color-border)', borderRadius: '10px', color: 'var(--color-text-main)', padding: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', transition: 'all 0.2s' },
  filterBtnActive: { background: 'var(--color-accent)', color: 'var(--color-bg-main, #000)', borderColor: 'var(--color-accent)' },

  actions: { display: 'flex', gap: '12px' },
  scanBtn: { flex: 2, background: 'var(--color-accent)', border: 'none', borderRadius: '16px', color: 'var(--color-bg-main, #000)', fontWeight: 'bold', padding: '16px', cursor: 'pointer', fontSize: '15px' },
  clearBtn: { flex: 1, background: 'var(--color-bg-elevated, #2D3748)', border: '1px solid var(--color-border)', borderRadius: '16px', color: 'var(--color-text-main)', padding: '16px', cursor: 'pointer', fontSize: '13px' },
  
  resultArea: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' },
  resHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-muted)', letterSpacing: '1px' },
  copyBtn: { background: 'var(--color-accent)', border: 'none', borderRadius: '10px', color: 'var(--color-bg-main, #000)', padding: '8px 16px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' },
  resText: { width: '100%', background: 'var(--color-bg-elevated, #2D3748)', border: '1px solid var(--color-border)', borderRadius: '14px', color: 'var(--color-text-main)', padding: '16px', fontSize: '14px', minHeight: '200px', outline: 'none', resize: 'vertical', fontFamily: 'monospace', lineHeight: '1.6' }
};
