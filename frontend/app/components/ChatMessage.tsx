import React, { useState } from 'react';
import { marked } from 'marked';
import { Message } from '../api/api';

// Import properly - default imports
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import remarkGfm from 'remark-gfm';

// Define types for the component props
interface CodeProps {
  node: any;
  inline: boolean;
  className?: string;
  children: React.ReactNode;
  [key: string]: any;
}

interface ComponentProps {
  children: React.ReactNode;
}

interface LinkProps extends ComponentProps {
  href?: string;
}

interface ImageProps {
  src?: string;
  alt?: string;
}

interface ChatMessageProps {
  message: Message & { id: string };
  onRegenerate?: () => void;
}

// Extend the Message type to include thinking
declare module '../api/api' {
  interface Message {
    thinking?: string;
  }
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onRegenerate }) => {
  const [showThinking, setShowThinking] = useState(false);
  const [copied, setCopied] = useState(false);
  
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
  const isAssistant = message.role === 'assistant';
  const hasThinking = !isUser && !isSystem && message.thinking;
  
  // Extract final answer from content if thinking is present
  const getMainAnswer = () => {
    if (!message.thinking) return message.content;
    
    // For simplicity, we're assuming the last paragraph is the final answer
    // In a real implementation, you might have a more sophisticated way to separate them
    const paragraphs = message.content.split('\n\n');
    if (paragraphs.length > 1) {
      return paragraphs[paragraphs.length - 1];
    }
    return message.content;
  };

  const handleCopy = () => {
    const content = isUser ? message.content : getMainAnswer();
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  
  // For system messages, use a special info/status layout
  if (isSystem) {
    return (
      <div className="my-2 p-3 rounded-md bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 text-center text-sm font-medium animate-fadeIn">
        <div dangerouslySetInnerHTML={{ __html: message.content }} />
      </div>
    );
  }
  
  // For user and assistant messages, use chat bubble layout
  return (
    <div className="my-8 animate-slideUp">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {isUser ? (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-sm">
              A
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
          )}
        </div>
        
        {/* Message content */}
        <div className="flex-1">
          {/* User/Assistant label */}
          <div className="text-xs text-gray-500 mb-1 flex items-center">
            {isUser ? 'You' : 'CHAT A.I+'} 
            {isAssistant && (
              <button 
                onClick={handleCopy}
                className="ml-2 text-gray-400 hover:text-gray-600 transition-colors group relative"
                aria-label="Copy message"
              >
                {copied ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                )}
                <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                  {copied ? 'Copied!' : 'Copy to clipboard'}
                </span>
              </button>
            )}
          </div>
          
          {/* Message body with refined styling */}
          <div className={`prose prose-sm max-w-none ${isUser ? 'text-gray-800' : 'text-gray-800'}`}>
            <div 
              className={`p-4 rounded-lg ${
                isUser 
                  ? 'bg-gradient-to-r from-indigo-50 to-indigo-100 border border-indigo-200/40' 
                  : 'bg-white border border-gray-200 shadow-sm'
              }`}
            >
              <div className="prose prose-sm max-w-none break-words">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code: ({node, inline, className, children, ...props}) => {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <div className="my-4 overflow-hidden rounded-md">
                          <div className="flex items-center justify-between bg-gray-800 px-4 py-2 text-xs text-white">
                            <span>{match[1]}</span>
                            <button 
                              onClick={() => navigator.clipboard.writeText(String(children).replace(/\n$/, ''))}
                              className="text-xs bg-gray-700 px-2 py-1 rounded hover:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-500 transition-colors"
                            >
                              Copy
                            </button>
                          </div>
                          <SyntaxHighlighter
                            style={atomDark}
                            language={match[1]}
                            PreTag="div"
                            {...props}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        </div>
                      ) : (
                        <code className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-sm" {...props}>
                          {children}
                        </code>
                      );
                    },
                    p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                    ul: ({children}) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
                    ol: ({children}) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
                    li: ({children}) => <li className="mb-1">{children}</li>,
                    a: ({href, children}) => (
                      <a 
                        href={href} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        {children}
                      </a>
                    ),
                    blockquote: ({children}) => (
                      <blockquote className="border-l-4 border-gray-200 pl-3 text-gray-700 italic my-2">
                        {children}
                      </blockquote>
                    ),
                    table: ({children}) => (
                      <div className="overflow-x-auto my-4">
                        <table className="min-w-full divide-y divide-gray-200">
                          {children}
                        </table>
                      </div>
                    ),
                    thead: ({children}) => <thead className="bg-gray-50">{children}</thead>,
                    tbody: ({children}) => <tbody className="divide-y divide-gray-200">{children}</tbody>,
                    tr: ({children}) => <tr>{children}</tr>,
                    th: ({children}) => <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{children}</th>,
                    td: ({children}) => <td className="px-4 py-2 text-sm text-gray-900">{children}</td>,
                    hr: () => <hr className="my-4 border-gray-200" />,
                    h1: ({children}) => <h1 className="text-xl font-bold my-3">{children}</h1>,
                    h2: ({children}) => <h2 className="text-lg font-bold my-3">{children}</h2>,
                    h3: ({children}) => <h3 className="text-md font-bold my-2">{children}</h3>,
                    h4: ({children}) => <h4 className="text-base font-bold my-2">{children}</h4>,
                    img: ({src, alt}) => (
                      <img 
                        src={src || ''} 
                        alt={alt || ''} 
                        className="max-w-full h-auto rounded my-2" 
                      />
                    )
                  }}
                >
                  {isUser ? message.content : getMainAnswer()}
                </ReactMarkdown>
              </div>
            </div>
          </div>
          
          {/* Message actions (reactions, regenerate) with refined styling */}
          {isAssistant && (
            <div className="mt-2 flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <button className="p-1 text-gray-400 hover:text-indigo-600 transition-colors rounded-full hover:bg-indigo-50">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                  </svg>
                </button>
                <button className="p-1 text-gray-400 hover:text-indigo-600 transition-colors rounded-full hover:bg-indigo-50">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.105-1.79l-.05-.025A4 4 0 0011.055 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
                  </svg>
                </button>
                <button className="p-1 text-gray-400 hover:text-indigo-600 transition-colors rounded-full hover:bg-indigo-50">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <div className="flex-1"></div>
              <button 
                onClick={onRegenerate}
                className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 transition-colors px-2 py-1 rounded-md hover:bg-indigo-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                Regenerate
              </button>
            </div>
          )}
          
          {/* Show thinking/reasoning with refined styling */}
          {hasThinking && (
            <div className="mt-2">
              <button
                onClick={() => setShowThinking(!showThinking)}
                className="flex items-center text-xs text-indigo-600 hover:text-indigo-800 transition-colors p-1 rounded hover:bg-indigo-50"
              >
                <svg
                  className={`h-4 w-4 mr-1 transition-transform duration-200 ${showThinking ? 'rotate-90' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                {showThinking ? 'Hide reasoning' : 'Show reasoning'}
              </button>
              
              {showThinking && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-2 animate-fadeIn">
                  <div className="prose prose-sm max-w-none text-gray-700">
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(message.thinking || '') }} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage; 