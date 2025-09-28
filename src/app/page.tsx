'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import SourcesPanel from '@/components/SourcesPanel';
import ChatContainer from '@/components/ChatContainer';
import { UploadedResource } from '@/types/common';

export default function Home() {
  const { data: session, status } = useSession();
  const [resources, setResources] = useState<UploadedResource[]>([]);
  const [selectedResource, setSelectedResource] = useState<UploadedResource | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Please sign in to access the RAG app.</div>
      </div>
    );
  }

  const handleResourceUpload = async (files: File[], type: 'pdf' | 'text' | 'website', url?: string) => {
    // Check if adding new resources would exceed the limit
    const currentCount = resources.length;
    const newCount = files.length + (url ? 1 : 0);

    if (currentCount + newCount > 5) {
      alert('Maximum 5 sources allowed. Please remove some sources before adding new ones.');
      return;
    }

    // Immediately add resources to show loading state
    const newResources: UploadedResource[] = files.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      name: file.name,
      type: type as 'pdf' | 'text',
      uploadDate: new Date(),
    }));

    if (url) {
      newResources.push({
        id: `${Date.now()}-website`,
        name: url,
        type: 'website',
        uploadDate: new Date(),
      });
    }

    // Add resources immediately to show them in the UI
    setResources(prev => [...prev, ...newResources]);

    // Set loading state
    setIsIndexing(true);

    try {
      const formData = new FormData();
      formData.append('dataSource', type === 'website' ? 'website' : 'upload');
      if (url) formData.append('websiteUrl', url);

      files.forEach((file, index) => {
        formData.append(`file_${index}`, file);
      });

      const response = await fetch('/api/index', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();

        // Update resources with summaries from the response
        if (data.summaries && data.summaries.length > 0) {
          setResources(prev => {
            return prev.map(resource => {
              const summaryData = data.summaries.find((s: { resourceName: string; summary: string }) => s.resourceName === resource.name);
              return summaryData ? { ...resource, summary: summaryData.summary } : resource;
            });
          });

          // Update selectedResource if it matches
          setSelectedResource(prev => {
            if (prev) {
              const summaryData = data.summaries.find((s: { resourceName: string; summary: string }) => s.resourceName === prev.name);
              return summaryData ? { ...prev, summary: summaryData.summary } : prev;
            }
            return prev;
          });
        }
      } else {
        console.error('Failed to index data');
        // Update resources to show error state
        setResources(prev =>
          prev.map(r =>
            newResources.some(nr => nr.id === r.id)
              ? { ...r, summary: 'Failed to process document. Please try again.' }
              : r
          )
        );
      }
    } catch (error) {
      console.error('Error indexing data:', error);
      // Update resources to show error state
      setResources(prev =>
        prev.map(r =>
          newResources.some(nr => nr.id === r.id)
            ? { ...r, summary: 'Error processing document. Please try again.' }
            : r
        )
      );
    } finally {
      setIsIndexing(false);
    }
  };


  const removeResource = (resourceId: string) => {
    setResources(prev => prev.filter(r => r.id !== resourceId));

    // If the removed resource was selected, select the first available resource
    if (selectedResource && selectedResource.id === resourceId) {
      const remainingResources = resources.filter(r => r.id !== resourceId);
      setSelectedResource(remainingResources.length > 0 ? remainingResources[0] : null);
    }
  };


  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header with User Info */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <h1 className="text-xl font-semibold">RAG App</h1>
          <span className="text-gray-400">|</span>
          <span className="text-sm text-gray-300">Welcome, {session.user?.name || session.user?.email}</span>
        </div>
        <button
          onClick={() => signOut()}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          Sign Out
        </button>
      </div>

      {/* Main Content */}
      <div className="flex flex-1">
        {/* Sources Panel - Left Side */}
        <div className="w-1/3 border-r border-gray-700 p-6">
          <SourcesPanel
            resources={resources}
            onResourceUpload={handleResourceUpload}
            onRemoveResource={removeResource}
            isIndexing={isIndexing}
          />
        </div>

        {/* Chat Container - Right Side */}
        <div className="flex-1 p-6">
          <ChatContainer
            resources={resources}
            selectedResource={selectedResource}
            onResourceSelect={setSelectedResource}
          />
        </div>
      </div>
    </div>
  );
}