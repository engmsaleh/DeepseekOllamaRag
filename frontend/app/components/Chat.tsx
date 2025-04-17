import React, { useState, useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import DocumentUploader from './DocumentUploader';
import { Message, checkOllamaStatus, checkDocumentStatus, askQuestion } from '../api/api';

const Chat: React.FC = () => {
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const [documentStatus, setDocumentStatus] = useState<string>('none');
  const [ollamaStatus, setOllamaStatus] = useState<boolean>(false);
  const [statusCheckInterval, setStatusCheckInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Effect to check Ollama status on load
  useEffect(() => {
    const checkOllama = async () => {
      const isRunning = await checkOllamaStatus();
      setOllamaStatus(isRunning);
      
      if (!isRunning) {
        setMessages(prev => [
          ...prev, 
          { 
            role: 'system', 
            content: '⚠️ Warning: Ollama is not running. Please start Ollama before processing documents.' 
          }
        ]);
      }
    };
    
    checkOllama();
  }, []);

  // Scroll to bottom of messages when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll for document status if it's processing
  useEffect(() => {
    // Clear any existing interval when component unmounts or status changes
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [statusCheckInterval]);

  // Handle document upload
  const handleUploadStart = () => {
    setDocumentStatus('uploading');
  };

  const handleUpload = (message: string) => {
    setMessages(prev => [...prev, { role: 'system', content: message }]);
    
    // Start polling for document status
    const interval = setInterval(async () => {
      try {
        const status = await checkDocumentStatus();
        setDocumentStatus(status.status);
        
        if (status.status === 'completed') {
          clearInterval(interval);
          setStatusCheckInterval(null);
          setMessages(prev => [
            ...prev,
            { 
              role: 'system', 
              content: `Document '${status.filename}' has been processed successfully. You can now ask questions about it.` 
            }
          ]);
        } else if (status.status === 'error') {
          clearInterval(interval);
          setStatusCheckInterval(null);
          setMessages(prev => [
            ...prev, 
            { 
              role: 'system', 
              content: `Error processing document: ${status.error || 'Unknown error'}` 
            }
          ]);
        }
      } catch (error) {
        clearInterval(interval);
        setStatusCheckInterval(null);
        setMessages(prev => [
          ...prev, 
          { 
            role: 'system', 
            content: `Error checking document status: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }
        ]);
      }
    }, 2000);
    
    setStatusCheckInterval(interval);
  };

  // Handle sending a message/question
  const handleSendMessage = async (message: string) => {
    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    
    // Don't process if document is not ready
    if (documentStatus !== 'completed') {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Please upload and process a document first.' 
      }]);
      return;
    }
    
    setIsAsking(true);
    
    try {
      // Get answer from API
      const answer = await askQuestion(message);
      
      // Add AI response to chat
      setMessages(prev => [...prev, { role: 'assistant', content: answer }]);
    } catch (error) {
      // Handle error
      setMessages(prev => [...prev, { 
        role: 'system', 
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white text-center">
          DeepSeek RAG Assistant
        </h1>
      </header>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-1/4 min-w-72 p-4 bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <h2 className="text-lg font-bold mb-4 dark:text-white">Document RAG</h2>
          
          {/* Document upload section */}
          <div className="mb-6">
            <h3 className="text-md font-medium mb-2 dark:text-gray-200">📄 Upload Document</h3>
            <DocumentUploader 
              onUpload={handleUpload} 
              onUploadStart={handleUploadStart}
              disabled={documentStatus === 'processing' || documentStatus === 'uploading'}
            />
          </div>
          
          {/* Settings section */}
          <div className="mb-6">
            <details className="cursor-pointer">
              <summary className="text-md font-medium mb-2 dark:text-gray-200">⚙️ Settings</summary>
              <div className="pl-2 mt-2 text-sm dark:text-gray-300">
                <p className="mb-1">• <strong>Embedding Model</strong>: HuggingFace</p>
                <p className="mb-1">• <strong>Retriever Type</strong>: Similarity Search</p>
                <p className="mb-1">• <strong>LLM</strong>: DeepSeek R1 (Ollama)</p>
              </div>
            </details>
          </div>
          
          {/* Instructions section */}
          <div>
            <h3 className="text-md font-medium mb-2 dark:text-gray-200">📝 Instructions</h3>
            <ol className="pl-5 list-decimal space-y-1 text-sm dark:text-gray-300">
              <li>Upload a PDF document</li>
              <li>Wait for processing to complete</li>
              <li>Ask questions about the document</li>
              <li>Get AI responses based on the content</li>
            </ol>
          </div>
          
          {/* Status indicator */}
          {!ollamaStatus && (
            <div className="mt-6 p-2 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded text-sm">
              ⚠️ Ollama is not running. Please start Ollama before processing documents.
            </div>
          )}
        </aside>

        {/* Chat area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md mx-auto p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-semibold mb-2 dark:text-white">Welcome to DeepSeek RAG Assistant</h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Upload a PDF document in the sidebar to start asking questions.
                  </p>
                </div>
              </div>
            )}
            
            {messages.map((message, index) => (
              <ChatMessage key={index} message={message} />
            ))}
            
            {/* Auto-scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input */}
          <div className="border-t border-gray-200 dark:border-gray-700">
            <ChatInput 
              onSendMessage={handleSendMessage} 
              isProcessing={isAsking}
              disabled={documentStatus !== 'completed'}
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Chat; 