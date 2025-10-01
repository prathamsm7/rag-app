'use client';

import React from 'react';
import { SessionResource } from '@/types/Session';

interface SourceSelectionProps {
  resources: SessionResource[];
  selectedResources: string[];
  onResourceSelect: (resourceId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onAddResource: () => void;
  onDiscoverResources: () => void;
  onDeleteResource: (resourceId: string) => void;
}

export default function SourceSelection({
  resources,
  selectedResources,
  onResourceSelect,
  onSelectAll,
  onAddResource,
  onDiscoverResources,
  onDeleteResource,
}: SourceSelectionProps) {
  const allSelected = resources.length > 0 && selectedResources.length === resources.length;
  const someSelected = selectedResources.length > 0 && selectedResources.length < resources.length;

  const getResourceIcon = (type: string, source: string) => {
    if (type === 'website') {
      if (source.includes('youtube.com') || source.includes('youtu.be')) {
        return '🔴'; // YouTube icon
      }
      if (source.includes('github.com')) {
        return '🐙'; // GitHub icon
      }
      if (source.includes('stackoverflow.com')) {
        return '📚'; // Stack Overflow icon
      }
      return '🌐'; // Generic website icon
    }
    if (type === 'pdf') return '📄';
    if (type === 'text') return '📝';
    return '📄';
  };

  const getResourceTitle = (resource: SessionResource) => {
    if (resource.name.length > 50) {
      return resource.name.substring(0, 50) + '...';
    }
    return resource.name;
  };

  return (
    <div className="h-full bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Sources</h2>
        
        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={onAddResource}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>+ Add</span>
          </button>
          
          <button
            onClick={onDiscoverResources}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Discover</span>
          </button>
        </div>
      </div>

      {/* Source Selection */}
      <div className="space-y-4">
        {/* Select All */}
        <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg">
          <input
            type="checkbox"
            id="select-all"
            checked={allSelected}
            ref={(input) => {
              if (input) input.indeterminate = someSelected;
            }}
            onChange={(e) => onSelectAll(e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
          />
          <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
            Select all sources
          </label>
        </div>

        {/* Individual Sources */}
        <div className="space-y-2">
          {resources.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-3">📄</div>
              <p className="text-gray-500 text-sm">No sources added yet</p>
              <p className="text-gray-600 text-xs mt-1">Add sources to get started</p>
            </div>
          ) : (
            resources.map((resource) => (
              <div
                key={resource.id}
                className={`flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-750 transition-colors ${
                  selectedResources.includes(resource.id) 
                    ? 'bg-blue-900 bg-opacity-30 border border-blue-600' 
                    : 'bg-gray-800'
                }`}
              >
                <input
                  type="checkbox"
                  id={`resource-${resource.id}`}
                  checked={selectedResources.includes(resource.id)}
                  onChange={(e) => onResourceSelect(resource.id, e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                />
                
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <span className="text-lg">{getResourceIcon(resource.type, resource.source)}</span>
                  
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-medium truncate">
                      {getResourceTitle(resource)}
                    </h4>
                    <p className="text-xs text-gray-400 truncate">
                      {resource.type === 'website' ? 'Website' : resource.type.toUpperCase()}
                    </p>
                  </div>
                </div>
                
                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Are you sure you want to delete "${getResourceTitle(resource)}"? This will remove it from the vector database and cannot be undone.`)) {
                      onDeleteResource(resource.id);
                    }
                  }}
                  className="text-gray-400 hover:text-red-400 p-1 rounded transition-colors"
                  title="Delete resource"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <div className="text-xs text-gray-500 text-center">
          {resources.length} source{resources.length !== 1 ? 's' : ''} available
        </div>
      </div>
    </div>
  );
}
