'use client';

import { useState, useRef, useEffect } from 'react';
import { Message } from '@/types/common';
import { SessionResource } from '@/types/Session';

interface ChatInterfaceProps {
  currentSession: any;
  sessionResources: SessionResource[];
  selectedResources: string[];
  onAddSessionResource: (type: 'pdf' | 'website' | 'text', data: any) => void;
  onRemoveSessionResource: (resourceId: string) => void;
  isIndexing: boolean;
}

export default function ChatInterface({
  currentSession,
  sessionResources,
  selectedResources,
  onAddSessionResource,
  onRemoveSessionResource,
  isIndexing,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentSession && currentSession.messages) {
      setMessages(currentSession.messages.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        isUser: msg.role === 'user',
        timestamp: new Date(msg.createdAt),
      })));
    } else {
      setMessages([]);
    }
  }, [currentSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

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
        body: JSON.stringify({ 
          message: inputMessage,
          chatSessionId: currentSession?.id || null,
          documentIds: selectedResources
        }),
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
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered a network error. Please try again.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">{currentSession?.title || 'New Chat'}</h2>
          <p className="text-sm text-gray-400">
            {selectedResources.length} of {sessionResources.length} sources selected
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-400">
            {sessionResources.length} source{sessionResources.length !== 1 ? 's' : ''} loaded
          </span>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {!currentSession ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">💬</div>
            <h3 className="text-xl font-semibold mb-2">Select a conversation</h3>
            <p className="text-gray-500">Choose a conversation from the list to start chatting</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🚀</div>
            <h3 className="text-xl font-semibold mb-2">Start the conversation</h3>
            <p className="text-gray-500 mb-6">Ask questions about your selected sources</p>
            
            {selectedResources.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-gray-400">Suggested questions:</p>
                <div className="space-y-2">
                  <button
                    onClick={() => setInputMessage("What are the key concepts covered in these sources?")}
                    className="block w-full text-left px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
                  >
                    What are the key concepts covered in these sources?
                  </button>
                  <button
                    onClick={() => setInputMessage("Can you summarize the main topics?")}
                    className="block w-full text-left px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
                  >
                    Can you summarize the main topics?
                  </button>
                  <button
                    onClick={() => setInputMessage("What are the important takeaways?")}
                    className="block w-full text-left px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
                  >
                    What are the important takeaways?
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl px-4 py-3 rounded-lg ${
                  message.isUser
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-100'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                <p className={`text-xs mt-2 ${
                  message.isUser ? 'text-blue-100' : 'text-gray-400'
                }`}>
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="bg-gray-800 border-t border-gray-700 p-6">
        <div className="flex items-center space-x-4">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question about your sources..."
            className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-white placeholder-gray-400"
            disabled={isLoading || selectedResources.length === 0}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading || selectedResources.length === 0}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white p-3 rounded-full transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        {selectedResources.length === 0 && (
          <p className="text-sm text-gray-500 mt-2">
            Select at least one source to start chatting
          </p>
        )}
      </div>
    </div>
  );
}