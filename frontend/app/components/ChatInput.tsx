import React, { useState, KeyboardEvent, useRef, useEffect } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage,
  disabled = false,
  placeholder = "Ask a question about your document..."
}) => {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize the textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 150);
      textarea.style.height = `${newHeight}px`;
    }
  }, [message]);

  const handleSubmit = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-gray-100 bg-white p-4 rounded-b-lg shadow-sm transition-all">
      <div className={`relative rounded-xl ${isFocused ? 'ring-2 ring-indigo-400 ring-opacity-50' : 'ring-1 ring-gray-200'} transition-all duration-200`}>
        <textarea
          ref={textareaRef}
          className={`w-full px-4 py-3 pr-12 resize-none rounded-xl focus:outline-none transition-colors duration-200 ${
            disabled 
              ? 'bg-gray-50 text-gray-500 cursor-not-allowed' 
              : 'bg-white text-gray-800'
          }`}
          rows={1}
          placeholder={placeholder}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
        />
        <button
          className={`absolute right-2 bottom-2 p-2 rounded-full text-white transition-all duration-200 transform ${
            message.trim() && !disabled
              ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 hover:shadow-md hover:scale-105'
              : 'bg-gray-300 cursor-not-allowed opacity-70'
          }`}
          onClick={handleSubmit}
          disabled={!message.trim() || disabled}
          aria-label="Send message"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>
      </div>
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-gray-500">
          Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Enter</kbd> to send. Use <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Shift+Enter</kbd> for new line.
        </p>
        {disabled && (
          <span className="text-xs bg-amber-50 text-amber-600 px-2 py-1 rounded-md flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {disabled ? "Document processing required" : ""}
          </span>
        )}
      </div>
    </div>
  );
};

export default ChatInput; 