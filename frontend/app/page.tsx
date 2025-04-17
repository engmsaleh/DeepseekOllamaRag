'use client';

import { useState, useEffect } from 'react';
import Chat from './components/Chat';
import DocumentUploader from './components/DocumentUploader';
import { uploadDocument, checkDocumentStatus, checkOllamaStatus } from './api/api';

export default function Home() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOllamaRunning, setIsOllamaRunning] = useState(true);

  useEffect(() => {
    // Check if Ollama is running when the app loads
    const checkOllama = async () => {
      try {
        const running = await checkOllamaStatus();
        setIsOllamaRunning(running);
      } catch (error) {
        console.error('Error checking Ollama status:', error);
        setIsOllamaRunning(false);
      }
    };

    checkOllama();
    
    // Also check document status on initial load
    const checkDocument = async () => {
      try {
        const status = await checkDocumentStatus();
        if (status.status === 'processing') {
          setIsProcessing(true);
        }
      } catch (error) {
        console.error('Error checking document status:', error);
      }
    };
    
    checkDocument();
  }, []);

  const handleDocumentUpload = async (file: File) => {
    setIsProcessing(true);
    try {
      await uploadDocument(file);
      return Promise.resolve();
    } catch (error) {
      console.error('Error uploading document:', error);
      setIsProcessing(false);
      return Promise.reject(error);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Chat apiUrl={apiUrl} onDocumentUpload={handleDocumentUpload} />
    </div>
  );
}
