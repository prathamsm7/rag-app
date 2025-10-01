'use client';

import { useState, useRef } from 'react';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResourceUpload: (files: File[], type: 'pdf' | 'text' | 'website', url?: string) => void;
  isIndexing: boolean;
}

export default function NewChatModal({
  isOpen,
  onClose,
  onResourceUpload,
  isIndexing,
}: NewChatModalProps) {
  const [uploadType, setUploadType] = useState<'pdf' | 'text' | 'website'>('pdf');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [textContent, setTextContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onResourceUpload(Array.from(files), uploadType);
      onClose();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleWebsiteSubmit = () => {
    if (websiteUrl.trim()) {
      onResourceUpload([], 'website', websiteUrl);
      onClose();
      setWebsiteUrl('');
    }
  };

  const handleTextSubmit = () => {
    if (textContent.trim()) {
      onResourceUpload([], 'text', undefined, textContent);
      onClose();
      setTextContent('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 w-96 max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Start New Chat</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <p className="text-sm text-gray-400 mb-6">
          Upload resources to start a new chat session
        </p>
        
        {/* Upload Type Selection */}
        <div className="space-y-3 mb-4">
          <label className="block text-sm font-medium">Resource Type:</label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="uploadType"
                value="pdf"
                checked={uploadType === 'pdf'}
                onChange={(e) => setUploadType(e.target.value as 'pdf')}
                className="mr-2"
              />
              PDF File
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="uploadType"
                value="website"
                checked={uploadType === 'website'}
                onChange={(e) => setUploadType(e.target.value as 'website')}
                className="mr-2"
              />
              Website URL
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="uploadType"
                value="text"
                checked={uploadType === 'text'}
                onChange={(e) => setUploadType(e.target.value as 'text')}
                className="mr-2"
              />
              Text Content
            </label>
          </div>
        </div>

        {/* File Upload */}
        {uploadType === 'pdf' && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Select PDF File:</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
            />
          </div>
        )}

        {/* Website URL */}
        {uploadType === 'website' && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Website URL:</label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleWebsiteSubmit}
              disabled={!websiteUrl.trim() || isIndexing}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {isIndexing ? 'Processing...' : 'Add Website'}
            </button>
          </div>
        )}

        {/* Text Content */}
        {uploadType === 'text' && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Text Content:</label>
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Enter your text content here..."
              rows={4}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <button
              onClick={handleTextSubmit}
              disabled={!textContent.trim() || isIndexing}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {isIndexing ? 'Processing...' : 'Add Text'}
            </button>
          </div>
        )}

        {/* Loading State */}
        {isIndexing && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-sm text-gray-400">Processing resources...</span>
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isIndexing}
          className="w-full bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
