'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { ChatSession, SessionResource } from '@/types/Session';
import SourceSelection from '@/components/SourceSelection';
import ChatInterface from '@/components/ChatInterface';
import NewChatModal from '@/components/NewChatModal';

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  // State management
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [sessionResources, setSessionResources] = useState<SessionResource[]>([]);
  const [selectedResources, setSelectedResources] = useState<string[]>([]);
  const [isIndexing, setIsIndexing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const loadingRef = useRef(false);

  // Load session data when component mounts or sessionId changes
  useEffect(() => {
    if (session?.user?.id && sessionId && !loadingRef.current) {
      loadSessionData();
    }
  }, [session?.user?.id, sessionId]);

  const loadSessionData = async () => {
    if (loadingRef.current) return;
    
    loadingRef.current = true;
    setLoading(true);
    
    try {
      const response = await fetch('/api/user-data?type=chat-sessions');
      if (response.ok) {
        const data = await response.json();
        const sessionData = data.chatSessions.find((s: any) => s.id === sessionId);
        
        if (sessionData) {
          // Convert session data to our format
          const session: ChatSession = {
            id: sessionData.id,
            title: sessionData.title || 'Untitled Chat',
            resources: sessionData.documents || [],
            messages: sessionData.messages || [],
            createdAt: sessionData.createdAt,
            updatedAt: sessionData.updatedAt,
          };

          setCurrentSession(session);
          setSessionResources(sessionData.documents || []);
          
          // Auto-select all resources for the session
          setSelectedResources(sessionData.documents?.map((doc: any) => doc.id) || []);
        } else {
          // Session not found, redirect to home
          router.push('/');
        }
      } else {
        console.error('Failed to load session data');
        router.push('/');
      }
    } catch (error) {
      console.error('Error loading session data:', error);
      router.push('/');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  const handleResourceUpload = async (files: File[], type: 'pdf' | 'text' | 'website', url?: string) => {
    const formData = new FormData();
    
    if (type === 'pdf' && files.length > 0) {
      files.forEach((file, index) => {
        formData.append(`file_${index}`, file);
      });
      formData.append('dataSource', 'upload');
    } else if (type === 'website' && url) {
      formData.append('dataSource', 'website');
      formData.append('websiteUrl', url);
    } else if (type === 'text') {
      formData.append('dataSource', 'text');
      formData.append('textContent', files[0]?.name || '');
    }

    // Add chatSessionId to associate with current session
    formData.append('chatSessionId', sessionId);

    setIsIndexing(true);

    try {
      const response = await fetch('/api/index', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update documents with the chat session ID
        if (data.documents && data.documents.length > 0) {
          await Promise.all(
            data.documents.map(async (doc: any) => {
              const updateResponse = await fetch('/api/user-data', {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  type: 'document',
                  id: doc.id,
                  chatSessionId: sessionId
                }),
              });
              return updateResponse.ok;
            })
          );
        }
        
        // Reload session data to get the latest resources
        await loadSessionData();
      } else {
        console.error('Failed to index data');
      }
    } catch (error) {
      console.error('Error uploading resources:', error);
    } finally {
      setIsIndexing(false);
    }
  };

  // Source selection functions
  const handleResourceSelect = (resourceId: string, selected: boolean) => {
    if (selected) {
      setSelectedResources(prev => [...prev, resourceId]);
    } else {
      setSelectedResources(prev => prev.filter(id => id !== resourceId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedResources(sessionResources.map(r => r.id));
    } else {
      setSelectedResources([]);
    }
  };

  const handleAddResource = () => {
    setShowNewChatModal(true);
  };

  const handleDiscoverResources = () => {
    // TODO: Implement resource discovery feature
    console.log('Discover resources clicked');
  };

  // Session resource management
  const handleAddSessionResource = async (type: 'pdf' | 'website' | 'text', data: any) => {
    console.log('Adding resource to session:', { type, data });
  };

  const handleRemoveSessionResource = async (resourceId: string) => {
    try {
      const response = await fetch(`/api/user-data?type=document&id=${resourceId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Reload session data to reflect the deletion
        await loadSessionData();
      } else {
        console.error('Failed to delete document');
        alert('Failed to delete document. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Error deleting document. Please try again.');
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Please sign in to access the chat.</div>
      </div>
    );
  }

  if (!currentSession) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Session not found.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header with Navigation */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-6">
          <button
            onClick={() => router.push('/')}
            className="text-gray-400 hover:text-white transition-colors flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Conversations</span>
          </button>
          <span className="text-gray-400">|</span>
          <h1 className="text-xl font-semibold">{currentSession.title}</h1>
          <span className="text-gray-400">|</span>
          {/* <span className="text-sm text-gray-300">Welcome, {session.user?.name || session.user?.email}</span> */}
        </div>
        <button
          onClick={() => {
            window.location.href = '/api/auth/signout';
          }}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          Sign Out
        </button>
      </div>

      {/* Main Layout */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* Sources Panel */}
        <div className="w-1/3 border-r border-gray-700">
          <SourceSelection
            resources={sessionResources}
            selectedResources={selectedResources}
            onResourceSelect={handleResourceSelect}
            onSelectAll={handleSelectAll}
            onAddResource={handleAddResource}
            onDiscoverResources={handleDiscoverResources}
            onDeleteResource={handleRemoveSessionResource}
          />
        </div>

        {/* Chat Panel */}
        <div className="flex-1">
          <ChatInterface
            currentSession={currentSession}
            sessionResources={sessionResources}
            selectedResources={selectedResources}
            onAddSessionResource={handleAddSessionResource}
            onRemoveSessionResource={handleRemoveSessionResource}
            isIndexing={isIndexing}
          />
        </div>
      </div>

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onResourceUpload={handleResourceUpload}
        isIndexing={isIndexing}
      />
    </div>
  );
}
