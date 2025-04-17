import React from 'react';
import { marked } from 'marked';
import { Message } from '../api/api';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  // Parse markdown content
  const renderMarkdown = (content: string) => {
    try {
      return marked(content);
    } catch (error) {
      console.error('Markdown parsing error:', error);
      return content;
    }
  };

  // Determine message styling based on role
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  
  // For system messages, use a special info/status layout
  if (isSystem) {
    return (
      <div className="my-2 p-2 rounded-md bg-blue-100 dark:bg-blue-900/30 text-center text-sm font-medium">
        <div dangerouslySetInnerHTML={{ __html: message.content }} />
      </div>
    );
  }
  
  // For user and assistant messages, use chat bubble layout
  return (
    <div className={`flex items-start ${isUser ? 'justify-end' : 'justify-start'} my-4`}>
      <div 
        className={`flex items-start gap-2.5 max-w-3xl ${
          isUser ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        {/* Avatar */}
        <div className={`flex flex-shrink-0 items-center justify-center w-8 h-8 rounded-full text-white font-bold text-sm ${
          isUser ? 'bg-indigo-600' : 'bg-green-600'
        }`}>
          {isUser ? 'U' : 'AI'}
        </div>
        
        {/* Message content */}
        <div 
          className={`p-3 rounded-lg ${
            isUser 
              ? 'bg-indigo-100 dark:bg-indigo-900/40 rounded-tr-none' 
              : 'bg-gray-100 dark:bg-gray-800 rounded-tl-none'
          }`}
        >
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {/* Render markdown content */}
            <div dangerouslySetInnerHTML={{ __html: isUser ? message.content : renderMarkdown(message.content) }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage; 