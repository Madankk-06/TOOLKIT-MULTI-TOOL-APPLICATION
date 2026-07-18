import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import ToolWrapper from '../../components/ToolWrapper';

// Initialize PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

type ConversionMode = 'pdf-to-word' | 'word-to-pdf' | null;
type ConversionStatus = 'idle' | 'loading' | 'converting' | 'success' | 'error';

interface FileMeta {
  name: string;
  size: number;
  type: string;
  arrayBuffer?: ArrayBuffer;
}

export default function DocWordConverter() {
  const [fileMeta, setFileMeta] = useState<FileMeta | null>(null);
  const [mode, setMode] = useState<ConversionMode>(null);
  const [status, setStatus] = useState<ConversionStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const [outputFileName, setOutputFileName] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check for auto-loaded files from chatbot
  useEffect(() => {
    try {
      const pendingData = sessionStorage.getItem('chatbot-pending-file');
      if (pendingData) {
        sessionStorage.removeItem('chatbot-pending-file');
        const parsed = JSON.parse(pendingData);
        if (parsed.base64) {
          const bin = atob(parsed.base64);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) {
            bytes[i] = bin.charCodeAt(i);
          }
          
          const name = parsed.name || 'document';
          const ext = name.toLowerCase().split('.').pop() || '';
          let type = '';
          let selectedMode: ConversionMode = null;

          if (ext === 'pdf') {
            type = 'application/pdf';
            selectedMode = 'pdf-to-word';
          } else if (['docx', 'doc'].includes(ext)) {
            type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            selectedMode = 'word-to-pdf';
          }

          if (selectedMode) {
            const meta = {
              name,
              size: bytes.byteLength,
              type,
              arrayBuffer: bytes.buffer
            };
            setFileMeta(meta);
            setMode(selectedMode);
            // Run conversion automatically
            runConversion(meta, selectedMode);
          }
        }
      }
    } catch (e) {
      console.error('Failed to parse pending chatbot file', e);
    }
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    resetState();

    const name = file.name.toLowerCase();
    const ext = name.split('.').pop() || '';
    let selectedMode: ConversionMode = null;

    if (ext === 'pdf') {
      selectedMode = 'pdf-to-word';
    } else if (['docx', 'doc'].includes(ext)) {
      selectedMode = 'word-to-pdf';
    } else {
      setErrorMsg('Unsupported file format. Please upload PDF or DOCX/DOC.');
      setStatus('error');
      return;
    }

    const buf = await file.arrayBuffer();
    const meta: FileMeta = {
      name: file.name,
      size: file.size,
      type: file.type,
      arrayBuffer: buf
    };

    setFileMeta(meta);
    setMode(selectedMode);
    setStatus('idle');
  };

  const runConversion = async (meta: FileMeta, activeMode: ConversionMode) => {
    if (!meta.arrayBuffer || !activeMode) return;
    setStatus('converting');
    setProgress(10);
    setErrorMsg(null);

    try {
      if (activeMode === 'pdf-to-word') {
        await convertPdfToWord(meta.arrayBuffer, meta.name);
      } else {
        await convertWordToPdf(meta.arrayBuffer, meta.name);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Conversion failed. Please try again.');
      setStatus('error');
    }
  };

  const convertPdfToWord = async (buf: ArrayBuffer, name: string) => {
    setProgress(30);
    const pdf = await pdfjs.getDocument({ data: buf }).promise;
    const maxPages = pdf.numPages;
    const paragraphsList: string[] = [];

    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map(it => ('str' in it ? it.str : ''))
        .join(' ');
      
      // Simple split to create realistic paragraphs
      const lines = pageText.split(/(?<=\.|\?|!)\s+/);
      paragraphsList.push(...lines);
      setProgress(Math.round(30 + (i / maxPages) * 40));
    }

    setProgress(80);
    // Create DOCX structure using docx package
    const docChildren = paragraphsList
      .filter(p => p.trim().length > 0)
      .map(p => new Paragraph({
        children: [new TextRun({ text: p.trim(), size: 24, font: 'Calibri' })],
        spacing: { after: 120 }
      }));

    const doc = new Document({
      sections: [{
        properties: {},
        children: docChildren
      }]
    });

    const docxBlob = await Packer.toBlob(doc);
    setOutputBlob(docxBlob);
    
    const baseName = name.substring(0, name.lastIndexOf('.')) || name;
    setOutputFileName(`${baseName}.docx`);
    setProgress(100);
    setStatus('success');
  };

  const convertWordToPdf = async (buf: ArrayBuffer, name: string) => {
    setProgress(30);
    // Extract plain text from DOCX
    const mammothRes = await mammoth.extractRawText({ arrayBuffer: buf });
    const text = mammothRes.value;
    setProgress(60);

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxLineWidth = pageWidth - 2 * margin;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    
    const textLines = doc.splitTextToSize(text, maxLineWidth);
    const lineHeight = 6;
    let cursorY = margin;

    setProgress(80);

    for (let i = 0; i < textLines.length; i++) {
      if (cursorY + lineHeight > pageHeight - margin) {
        doc.addPage();
        cursorY = margin;
      }
      doc.text(textLines[i], margin, cursorY);
      cursorY += lineHeight;
    }

    const pdfBlob = doc.output('blob');
    setOutputBlob(pdfBlob);
    
    const baseName = name.substring(0, name.lastIndexOf('.')) || name;
    setOutputFileName(`${baseName}.pdf`);
    setProgress(100);
    setStatus('success');
  };

  const downloadResult = () => {
    if (!outputBlob || !outputFileName) return;
    const url = URL.createObjectURL(outputBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = outputFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const resetState = () => {
    setFileMeta(null);
    setMode(null);
    setStatus('idle');
    setProgress(0);
    setErrorMsg(null);
    setOutputBlob(null);
    setOutputFileName('');
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <ToolWrapper toolName="PDF ↔ Word Converter">
      <div style={styles.container}>
        <div 
          style={{ 
            ...styles.dropZone, 
            borderColor: fileMeta ? 'var(--color-accent)' : 'var(--color-border)' 
          }}
          onClick={() => !fileMeta && fileInputRef.current?.click()}
        >
          {fileMeta ? (
            <div style={styles.placeholder}>
              <span style={styles.icon}>📄</span>
              <div style={styles.hint}>{fileMeta.name}</div>
              <div style={styles.subHint}>{formatSize(fileMeta.size)}</div>
              <div style={{
                marginTop: 10,
                fontSize: 12,
                fontWeight: 'bold',
                color: 'var(--color-accent)',
                textTransform: 'uppercase'
              }}>
                Detected: {mode === 'pdf-to-word' ? 'PDF (Convert to Word)' : 'Word (Convert to PDF)'}
              </div>
            </div>
          ) : (
            <div style={styles.placeholder}>
              <span style={styles.icon}>🔄</span>
              <div style={styles.hint}>Click to upload PDF or Word Document</div>
              <div style={styles.subHint}>Supports PDF, DOCX, DOC files</div>
            </div>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".pdf,.docx,.doc" 
            style={{ display: 'none' }} 
          />
        </div>

        {status === 'idle' && fileMeta && mode && (
          <button 
            onClick={() => runConversion(fileMeta, mode)}
            style={styles.convertBtn}
          >
            Convert to {mode === 'pdf-to-word' ? 'Word (DOCX)' : 'PDF'}
          </button>
        )}

        {(status === 'converting' || status === 'success') && (
          <div style={styles.progressContainer}>
            <div style={styles.progressHeader}>
              <span>{status === 'success' ? 'Conversion Complete' : 'Converting...'}</span>
              <span>{progress}%</span>
            </div>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${progress}%` }} />
            </div>
          </div>
        )}

        {status === 'success' && (
          <div style={styles.successBox}>
            <p style={{ marginBottom: 12, fontSize: 14 }}>
              Converted successfully to <strong>{outputFileName}</strong>
            </p>
            <button onClick={downloadResult} style={styles.downloadBtn}>
              📥 Download File
            </button>
          </div>
        )}

        {status === 'error' && errorMsg && (
          <div style={styles.errorBox}>
            <p>⚠️ {errorMsg}</p>
          </div>
        )}

        {fileMeta && (
          <button onClick={resetState} style={styles.clearBtn}>
            Reset / Upload Another
          </button>
        )}
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: '24px', padding: '20px', maxWidth: '600px', margin: '0 auto', color: 'var(--color-text-main)' },
  dropZone: { background: 'var(--color-bg-surface)', border: '2px dashed', borderRadius: '32px', minHeight: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', transition: 'all 0.2s' },
  placeholder: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center', padding: '20px' },
  icon: { fontSize: '48px' },
  hint: { fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text-main)', wordBreak: 'break-all' },
  subHint: { fontSize: '12px', color: 'var(--color-text-muted)' },
  
  convertBtn: { width: '100%', background: 'var(--color-accent)', border: 'none', borderRadius: '16px', color: 'var(--color-bg-main, #000)', fontWeight: 'bold', padding: '16px', cursor: 'pointer', fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  clearBtn: { width: '100%', background: 'var(--color-bg-elevated, #2D3748)', border: '1px solid var(--color-border)', borderRadius: '16px', color: 'var(--color-text-main)', padding: '14px', cursor: 'pointer', fontSize: '13px' },
  
  progressContainer: { display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '20px', padding: '20px' },
  progressHeader: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold' },
  progressBar: { width: '100%', height: '8px', background: 'var(--color-border)', borderRadius: '4px', overflow: 'hidden' },
  progressFill: { height: '100%', background: 'var(--color-accent)', borderRadius: '4px', transition: 'width 0.3s ease' },

  successBox: { background: 'rgba(74, 222, 128, 0.08)', border: '1px solid rgba(74, 222, 128, 0.3)', borderRadius: '20px', padding: '20px', textAlign: 'center' },
  downloadBtn: { background: '#4ade80', border: 'none', borderRadius: '12px', color: '#000', fontWeight: 'bold', padding: '12px 24px', cursor: 'pointer', fontSize: '14px' },
  
  errorBox: { background: 'rgba(248, 113, 113, 0.08)', border: '1px solid rgba(248, 113, 113, 0.3)', borderRadius: '20px', padding: '16px', textAlign: 'center', color: '#f87171', fontSize: '13px' }
};
