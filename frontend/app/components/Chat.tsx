import React, { useState, useEffect, useRef } from 'react';
import { Message, askQuestion, checkDocumentStatus, checkOllamaStatus, uploadDocument } from '../api/api';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import DocumentUploader from './DocumentUploader';
import Settings from './Settings';
import History from './History';

// Extend the Message type to include an id property
export interface ExtendedMessage extends Message {
  id: string;
}

interface ChatProps {
  apiUrl: string;
  onDocumentUpload: (file: File) => Promise<void>;
}

// Utility function to generate unique IDs
const generateUniqueId = () => {
  return Date.now().toString() + '_' + Math.random().toString(36).substring(2, 9);
};

const Chat: React.FC<ChatProps> = ({ apiUrl, onDocumentUpload }) => {
  // State management
  const [messages, setMessages] = useState<ExtendedMessage[]>([
    {
      id: 'welcome',
      role: 'system',
      content: 'Welcome to DeepSeek RAG Chat! Upload a document to get started.',
    },
  ]);
  const [isAsking, setIsAsking] = useState(false);
  const [documentStatus, setDocumentStatus] = useState<'not_uploaded' | 'uploading' | 'processing' | 'processed' | 'error'>('not_uploaded');
  const [documentFilename, setDocumentFilename] = useState<string | null>(null);
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'running' | 'not_running'>('checking');
  const [isSidebarOpen, setIsSidebarOpen] = useState(typeof window !== 'undefined' && window.innerWidth >= 768);
  const [debugMode, setDebugMode] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check Ollama status on load
  useEffect(() => {
    const checkOllama = async () => {
      try {
        const isRunning = await checkOllamaStatus();
        setOllamaStatus(isRunning ? 'running' : 'not_running');
        
        if (!isRunning) {
          setMessages((prev) => [
            ...prev,
            {
              id: generateUniqueId(),
              role: 'system',
              content: "⚠️ Ollama is not running. Please start Ollama to use this application.",
            },
          ]);
        }
      } catch (error) {
        console.error('Error checking Ollama status:', error);
        setOllamaStatus('not_running');
      }
    };

    checkOllama();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Check document status periodically
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        const status = await checkDocumentStatus();
        
        if (status.status === 'processing' && documentStatus !== 'processing') {
          setDocumentStatus('processing');
          setDocumentFilename(status.filename);
          
          // Add a system message about processing
          setMessages((prev) => [
            ...prev,
            {
              id: generateUniqueId(),
              role: 'system',
              content: `📄 Processing document: ${status.filename || 'Unknown'}...`,
            },
          ]);
        } else if (status.status === 'completed' && documentStatus !== 'processed') {
          // Note: Backend uses 'completed' but frontend uses 'processed'
          setDocumentStatus('processed');
          
          // Add a system message that document is ready
          setMessages((prev) => [
            ...prev,
            {
              id: generateUniqueId(),
              role: 'system',
              content: `✅ Document ready! You can now ask questions about: ${status.filename || 'your document'}.`,
            },
          ]);
        } else if (status.status === 'error' && documentStatus !== 'error') {
          setDocumentStatus('error');
          
          // Add a system message about the error
          setMessages((prev) => [
            ...prev,
            {
              id: generateUniqueId(),
              role: 'system',
              content: `❌ Error processing document: ${status.error || 'Unknown error'}`,
            },
          ]);
        }
      } catch (error) {
        console.error('Error checking document status:', error);
      }
    };

    // Only poll if we're in a state where status might change
    if (documentStatus === 'uploading' || documentStatus === 'processing') {
      interval = setInterval(checkStatus, 2000);
      // Immediately check once
      checkStatus();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [documentStatus]);

  // Handle window resize for sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle document upload
  const handleDocumentUpload = async (file: File) => {
    setDocumentStatus('uploading');
    
    // Add a system message about the upload
    setMessages((prev) => [
      ...prev,
      {
        id: generateUniqueId(),
        role: 'system',
        content: `📤 Uploading document: ${file.name}...`,
      },
    ]);
    
    try {
      await onDocumentUpload(file);
      // Status will be updated by the effect
    } catch (error) {
      console.error('Error uploading document:', error);
      
      setDocumentStatus('error');
      setMessages((prev) => [
        ...prev,
        {
          id: generateUniqueId(),
          role: 'system',
          content: "❌ Error uploading document. Please try again.",
        },
      ]);
    }
  };

  // Handle sending messages
  const handleSendMessage = async (content: string) => {
    try {
      // Don't allow empty messages
      if (!content.trim()) return;

      // Add user message
      const userMessage: ExtendedMessage = {
        id: generateUniqueId(),
        content,
        role: 'user'
      };
      setMessages((prev) => [...prev, userMessage]);

      // Set asking state
      setIsAsking(true);

      // Check if document is processed
      if (!documentStatus || documentStatus !== 'processed') {
        setMessages((prev) => [
          ...prev,
          {
            id: generateUniqueId(),
            role: 'assistant' as const,
            content: 'Please upload and process a document first.'
          }
        ]);
        setIsAsking(false);
        return;
      }

      // Use the API function from api.ts
      const data = await askQuestion(content);
      
      // Add assistant message based on response
      if (data.thinking && debugMode) {
        // Show thinking if debug mode is enabled
        setMessages((prev) => [
          ...prev,
          {
            id: generateUniqueId(),
            role: 'assistant' as const,
            content: `${data.thinking}\n\n${data.answer}`,
            thinking: data.thinking
          }
        ]);
      } else {
        // Just show the answer
        setMessages((prev) => [
          ...prev,
          {
            id: generateUniqueId(),
            role: 'assistant' as const,
            content: data.answer,
            thinking: data.thinking
          }
        ]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: generateUniqueId(),
          role: 'system' as const,
          content: `⚠️ Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  // Handle regenerate for the last assistant message
  const handleRegenerate = async () => {
    // Find the last user message
    const lastUserMessageIndex = [...messages].reverse().findIndex(m => m.role === 'user');
    if (lastUserMessageIndex === -1) return;
    
    const lastUserMessage = messages[messages.length - 1 - lastUserMessageIndex];
    
    // Remove the last assistant message
    setMessages(prev => prev.slice(0, prev.length - 1));
    
    // Re-ask the question
    await handleSendMessage(lastUserMessage.content);
  };

  // Toggle sidebar
  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
    
    // On mobile, after clicking a conversation item, hide the sidebar
    if (window.innerWidth <= 768) {
      document.body.style.overflow = isSidebarOpen ? 'auto' : 'hidden';
    }
  };

  // Derived states
  const isDocumentProcessed = documentStatus === 'processed';
  const isDocumentProcessing = documentStatus === 'processing' || documentStatus === 'uploading';
  const isOllamaRunning = ollamaStatus === 'running';

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Mobile header with toggle */}
      <div className="md:hidden flex items-center justify-between bg-white shadow-sm p-4 z-10">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          aria-label="Toggle sidebar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-xl font-semibold text-indigo-700">DeepSeek RAG</h1>
        <div className="w-8"></div> {/* Spacer for alignment */}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          className={`fixed md:static inset-0 bg-white transform transition-transform duration-300 ease-in-out z-20 md:z-auto md:translate-x-0 md:w-80 lg:w-96 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } flex flex-col shadow-md md:border-r border-gray-200`}
        >
          {/* Sidebar content (rendered by parent component) */}
          <div className="p-2 h-screen overflow-y-auto flex flex-col gap-2">
            <div className="relative h-full">
              <div className="absolute inset-0 flex flex-col bg-white">
                {/* Mobile close button */}
                <div className="md:hidden flex justify-between items-center p-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-indigo-700">DeepSeek RAG</h2>
                  <button
                    onClick={toggleSidebar}
                    className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    aria-label="Close sidebar"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* Sidebar content rendered by parent component */}
                <div className="p-2">
                  <DocumentUploader 
                    onUpload={handleDocumentUpload}
                    isProcessing={isDocumentProcessing}
                    isOllamaRunning={isOllamaRunning}
                  />
                  
                  <History
                    currentDocument={documentFilename}
                  />
                  
                  <Settings 
                    isOllamaRunning={isOllamaRunning}
                    onDebugModeChange={setDebugMode}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {isAsking && (
                <ChatMessage
                  message={{
                    id: generateUniqueId(),
                    content: '',
                    role: 'assistant',
                    thinking: 'Thinking...',
                  } as ExtendedMessage}
                />
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Status indicator */}
          {documentStatus === 'processing' && (
            <div className="bg-yellow-50 border-t border-yellow-200 py-2 px-4 text-center text-amber-600 text-sm">
              <span className="animate-pulse inline-block mr-2">⏳</span> 
              Document is being processed. Please wait...
            </div>
          )}

          {/* Chat input */}
          <div className="max-w-4xl mx-auto w-full">
            <ChatInput
              onSendMessage={handleSendMessage}
              disabled={isAsking || documentStatus !== 'processed' || ollamaStatus !== 'running'}
              placeholder={
                documentStatus === 'not_uploaded'
                  ? "Upload a document to get started"
                  : documentStatus === 'processing'
                  ? "Waiting for document to be processed..."
                  : ollamaStatus !== 'running'
                  ? "Ollama is not running"
                  : "Ask a question about your document..."
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat; 