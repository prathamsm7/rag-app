'use client';

import { useState, useRef } from 'react';
import { SourcesPanelProps } from '@/types/SourcesPanel';

export default function SourcesPanel({
  resources,
  onResourceUpload,
  onRemoveResource,
  isIndexing,
}: SourcesPanelProps) {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState<'pdf' | 'text' | 'website'>('pdf');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onResourceUpload(Array.from(files), uploadType);
      setShowUploadModal(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleWebsiteSubmit = () => {
    if (websiteUrl.trim()) {
      onResourceUpload([], 'website', websiteUrl);
      setShowUploadModal(false);
      setWebsiteUrl('');
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return '📄';
      case 'website':
        return '🌐';
      default:
        return '📄';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">📁</span>
          <h2 className="text-xl font-semibold">Sources</h2>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2 mb-4">
        <button
          onClick={() => setShowUploadModal(true)}
          disabled={resources.length >= 5}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Add ({resources.length}/5)
        </button>
        <button className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          Discover
        </button>
      </div>

      {/* Upload Limit Info */}
      {resources.length >= 5 && (
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3 mb-4">
          <p className="text-sm text-yellow-300">
            Maximum 5 sources reached. Remove a source to add new ones.
          </p>
        </div>
      )}

      {/* Resources List */}
      <div className="flex-1 overflow-y-auto">
        {resources.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <div className="text-4xl mb-2">📁</div>
            <p className="text-sm">No sources added yet</p>
            <p className="text-xs text-gray-500 mt-1">Click "Add" to upload files or add websites</p>
          </div>
        ) : (
          <div className="space-y-2">
            {resources.map((resource) => (
              <div
                key={resource.id}
                className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors"
              >
                <span className="text-lg">{getFileIcon(resource.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {resource.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatDate(resource.uploadDate)}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {(isIndexing || !resource.summary) && (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      <span className="text-xs text-blue-400">
                        {isIndexing ? 'Processing...' : 'Generating summary...'}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => onRemoveResource(resource.id)}
                    className="text-red-400 hover:text-red-300 text-sm p-1"
                    title="Remove source"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Add Source</h3>
            
            {/* Upload Type Selection */}
            <div className="space-y-3 mb-4">
              <label className="block text-sm font-medium">Source Type:</label>
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
                  disabled={!websiteUrl.trim()}
                  className="w-full mt-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Add Website
                </button>
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={() => setShowUploadModal(false)}
              className="w-full bg-gray-600 hover:bg-gray-500 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
