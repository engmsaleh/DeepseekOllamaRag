// API base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Session ID management
export const getSessionId = (): string => {
  // Check if running in browser environment
  if (typeof window !== 'undefined') {
    let sessionId = localStorage.getItem('rag_session_id');
    if (!sessionId) {
      sessionId = 'session_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('rag_session_id', sessionId);
    }
    return sessionId;
  }
  // Fallback for SSR
  return 'session_' + Math.random().toString(36).substring(2, 15);
};

// Type definitions
export interface DocumentStatus {
  session_id: string;
  status: string;
  filename: string | null;
  error: string | null;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// API functions
export const checkOllamaStatus = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/status`);
    const data = await response.json();
    return data.ollama_running;
  } catch (error) {
    console.error('Error checking Ollama status:', error);
    return false;
  }
};

export const uploadDocument = async (file: File): Promise<string> => {
  const sessionId = getSessionId();
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await fetch(`${API_URL}/upload?session_id=${sessionId}`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Error uploading document');
    }
    
    const data = await response.json();
    return data.message;
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
};

export const checkDocumentStatus = async (): Promise<DocumentStatus> => {
  const sessionId = getSessionId();
  try {
    const response = await fetch(`${API_URL}/document/status/${sessionId}`);
    if (!response.ok) {
      throw new Error('Error checking document status');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking document status:', error);
    throw error;
  }
};

export const askQuestion = async (question: string): Promise<string> => {
  const sessionId = getSessionId();
  try {
    const response = await fetch(`${API_URL}/question`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        session_id: sessionId,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Error processing question');
    }
    
    const data = await response.json();
    return data.answer;
  } catch (error) {
    console.error('Error asking question:', error);
    throw error;
  }
}; 