'use client';

import { useState, useRef, useEffect } from 'react';
import { Message } from '@/types/common';
import { ChatContainerProps } from '@/types/ChatContainer';

export default function ChatContainer({
  resources,
  selectedResource,
  onResourceSelect,
}: ChatContainerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatMessage = (content: string) => {
    // Split content by code blocks
    const parts = content.split(/(```[\s\S]*?```|`[^`]+`)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        // Multi-line code block
        const code = part.slice(3, -3).trim();
        const language = code.split('\n')[0].match(/^\w+/) ? code.split('\n')[0] : '';
        const codeContent = language ? code.substring(language.length).trim() : code;
        
        return (
          <pre key={index} className="bg-gray-900 border border-gray-700 rounded-lg p-4 my-2 overflow-x-auto">
            {language && <div className="text-xs text-gray-400 mb-2">{language}</div>}
            <code className="text-green-400 text-sm">{codeContent}</code>
          </pre>
        );
      } else if (part.startsWith('`') && part.endsWith('`')) {
        // Inline code
        const code = part.slice(1, -1);
        return <code key={index} className="bg-gray-700 px-2 py-1 rounded text-green-400 text-sm">{code}</code>;
      } else {
        // Regular text
        return <span key={index}>{part}</span>;
      }
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-select first resource if none selected
  useEffect(() => {
    if (resources.length > 0 && !selectedResource) {
      onResourceSelect(resources[0]);
    }
  }, [resources, selectedResource, onResourceSelect]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || resources.length === 0 || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: inputMessage }),
      });

      if (response.ok) {
        const data = await response.json();
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data.response,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: 'Sorry, I encountered an error. Please try again.',
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error. Please try again.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const suggestedQueries = [
    "How are asynchronous operations managed using Promises and Async/Await?",
    "What are the key features of Node.js for web development?",
    "How do you implement authentication in Node.js applications?",
    "What is the role of Express.js in Node.js development?",
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Chat</h2>
        <div className="text-sm text-gray-400">
          {resources.length} source{resources.length !== 1 ? 's' : ''} loaded
        </div>
      </div>

      {/* Document Overview */}
      {selectedResource && (
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-start space-x-4">
            <div className="text-3xl">💻</div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">
                {selectedResource.name}
              </h3>
              <div className="text-sm text-gray-400 mb-3">
                {resources.length} source{resources.length !== 1 ? 's' : ''} loaded
              </div>
              
              
              {selectedResource.summary ? (
                <p className="text-gray-300 text-sm leading-relaxed mb-4">
                  {selectedResource.summary}
                </p>
              ) : (
                <div className="flex items-center space-x-2 text-gray-400 text-sm mb-4">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  <span>Generating summary...</span>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 bg-gray-800 rounded-lg p-4 mb-4 overflow-y-auto min-h-[300px] max-h-[400px]">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-gray-400 text-4xl mb-2">💬</div>
              <p className="text-sm text-gray-400 mb-4">
                {resources.length > 0 
                  ? 'Ask questions about your sources!' 
                  : 'Add some sources first to start chatting'
                }
              </p>
              
              {/* Suggested Queries */}
              {resources.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 mb-2">Suggested questions:</p>
                  {suggestedQueries.slice(0, 2).map((query, index) => (
                    <button
                      key={index}
                      onClick={() => setInputMessage(query)}
                      className="block w-full text-left text-xs text-blue-400 hover:text-blue-300 p-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
                    >
                      {query} →
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.isUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-100'
                  }`}
                >
                  <div className="text-sm">{formatMessage(message.content)}</div>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-700 text-gray-100 p-3 rounded-lg">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Chat Input */}
      <div className="flex space-x-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={resources.length > 0 ? "Start typing..." : "Add sources first..."}
          disabled={resources.length === 0 || isLoading}
          className="flex-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        <button
          onClick={handleSendMessage}
          disabled={!inputMessage.trim() || resources.length === 0 || isLoading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          ✈️
        </button>
      </div>

      {/* Source Count */}
      <div className="text-xs text-gray-400 mt-2 text-center">
        {resources.length} source{resources.length !== 1 ? 's' : ''} loaded
      </div>
    </div>
  );
}
