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
  thinking?: string; // Optional reasoning/thinking content
}

// Function to separate reasoning from answer
export const separateReasoningFromAnswer = (fullAnswer: string): { answer: string, thinking: string } => {
  // In a real implementation, this would be more sophisticated
  // This is a simple example assuming some consistent pattern
  
  // If the answer has a specific delimiter for the final answer
  if (fullAnswer.includes('\n\nFinal Answer:')) {
    const parts = fullAnswer.split('\n\nFinal Answer:');
    return {
      thinking: parts[0].trim(),
      answer: 'Final Answer: ' + parts[1].trim()
    };
  }
  
  // If there's no clear pattern, use a simple heuristic
  // Assume the reasoning is most of the content and the final answer is the last paragraph
  const paragraphs = fullAnswer.split('\n\n');
  if (paragraphs.length > 1) {
    // Last paragraph is the answer, everything else is reasoning
    return {
      thinking: paragraphs.slice(0, -1).join('\n\n'),
      answer: paragraphs[paragraphs.length - 1]
    };
  }
  
  // If it's just one paragraph, treat everything as the answer
  return {
    thinking: '',
    answer: fullAnswer
  };
};

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

export const askQuestion = async (question: string): Promise<{ answer: string, thinking: string }> => {
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
        include_reasoning: true, // Request reasoning if backend supports it
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Error processing question: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check if the backend already separates reasoning and answer
    if (data.thinking !== undefined && data.answer !== undefined) {
      return {
        answer: data.answer,
        thinking: data.thinking
      };
    }
    
    // Otherwise, parse it from the full answer
    return separateReasoningFromAnswer(data.answer);
  } catch (error) {
    console.error('Error asking question:', error);
    throw error;
  }
}; 