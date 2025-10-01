'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { UploadedResource } from '@/types/common';
import { ChatSession, SessionResource, AppState } from '@/types/Session';
import NewChatModal from '@/components/NewChatModal';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Legacy state for backward compatibility with SourcesPanel
  const [resources, setResources] = useState<UploadedResource[]>([]);
  const [selectedResource, setSelectedResource] = useState<UploadedResource | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(false);

  // New session-based state
  const [appState, setAppState] = useState<AppState>({
    hasResources: false,
    currentSession: null,
    sessions: [],
    isLoading: false,
  });

  // Modal state
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  // Load user-specific data when session is available
  useEffect(() => {
    if (session?.user?.id) {
      loadUserData();
    }
  }, [session?.user?.id]);

  const loadUserData = async () => {
    if (loadingRef.current) return;
    
    try {
      loadingRef.current = true;
      setLoading(true);
      const response = await fetch('/api/user-data?type=all');
      if (response.ok) {
        const data = await response.json();
        
        // Convert user documents to resources format for compatibility
        const convertedResources: UploadedResource[] = data.documents.map((doc: any) => ({
          id: doc.id,
          name: doc.name,
          type: doc.type as 'pdf' | 'text' | 'website',
          uploadDate: new Date(doc.createdAt),
          summary: doc.summary || undefined,
        }));
        setResources(convertedResources);

        // Convert chat sessions to new format
        const convertedSessions: ChatSession[] = data.chatSessions.map((session: any) => ({
          id: session.id,
          title: session.title || 'Untitled Chat',
          resources: session.documents || [], // Load documents from session
          messages: session.messages || [],
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        }));

        setAppState(prev => ({
          ...prev,
          hasResources: data.documents.length > 0,
          sessions: convertedSessions,
        }));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

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
        
        // Create a new chat session with the uploaded resource
        const sessionTitle = newResources.length === 1 
          ? newResources[0].name 
          : `${newResources.length} Resources`;
        
        // Create session via API
        const sessionResponse = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            message: `Session created with ${sessionTitle}`,
            createSession: true,
            sessionTitle: sessionTitle,
            documentIds: data.documents?.map((doc: any) => doc.id) || []
          }),
        });

        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          
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
                    chatSessionId: sessionData.chatSessionId
                  }),
                });
                return updateResponse.ok;
              })
            );
          }
          
          // Update app state with new session
          setAppState(prev => ({
            ...prev,
            hasResources: true,
            currentSession: {
              id: sessionData.chatSessionId,
              title: sessionTitle,
              resources: data.documents || [],
              messages: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          }));

          // Navigate to the new chat session
          router.push(`/chat/${sessionData.chatSessionId}`);
          
          // Close the modal
          setShowNewChatModal(false);
        }
        
        // Reload user data to get the latest documents with proper IDs and summaries
        await loadUserData();
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

  const removeResource = async (resourceId: string) => {
    try {
      // Delete from database
      const response = await fetch(`/api/user-data?type=document&id=${resourceId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Reload user data to reflect the deletion
        await loadUserData();
        
        // If the removed resource was selected, select the first available resource
        if (selectedResource && selectedResource.id === resourceId) {
          const remainingResources = resources.filter(r => r.id !== resourceId);
          setSelectedResource(remainingResources.length > 0 ? remainingResources[0] : null);
        }
      } else {
        console.error('Failed to delete document');
        alert('Failed to delete document. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Error deleting document. Please try again.');
    }
  };

  // Session management functions
  const handleSessionSelect = async (session: ChatSession | null) => {
    if (session) {
      // Load session details including messages and resources
      try {
        const response = await fetch(`/api/user-data?type=chat-sessions`);
        if (response.ok) {
          const data = await response.json();
          const sessionData = data.chatSessions.find((s: any) => s.id === session.id);
          
          if (sessionData) {
            // Convert messages to the correct format
            const messages = sessionData.messages.map((msg: any) => ({
              id: msg.id,
              role: msg.role,
              content: msg.content,
              createdAt: msg.createdAt,
            }));

            // Update current session with full data
            setAppState(prev => ({
              ...prev,
              currentSession: {
                ...session,
                messages: messages,
                resources: sessionData.resources || [],
              },
            }));

            // Update selected resource if session has resources
            if (sessionData.resources && sessionData.resources.length > 0) {
              const firstResource = sessionData.resources[0];
              setSelectedResource({
                id: firstResource.id,
                name: firstResource.name,
                type: firstResource.type,
                uploadDate: new Date(firstResource.createdAt),
                summary: firstResource.summary,
              });
            }
          }
        }
      } catch (error) {
        console.error('Error loading session details:', error);
      }
    } else {
      setAppState(prev => ({
        ...prev,
        currentSession: null,
      }));
      setSelectedResource(null);
    }
  };

  const handleNewSession = () => {
    setAppState(prev => ({
      ...prev,
      currentSession: null,
    }));
    // Reload chat sessions to get the latest list
    loadUserData();
  };

  const handleSessionDelete = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/user-data?type=chat-session&id=${sessionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Reload user data to reflect the deletion
        await loadUserData();
        
        // If the deleted session was current, clear it
        if (appState.currentSession?.id === sessionId) {
          setAppState(prev => ({
            ...prev,
            currentSession: null,
          }));
        }
      } else {
        console.error('Failed to delete chat session');
        alert('Failed to delete chat session. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting chat session:', error);
      alert('Error deleting chat session. Please try again.');
    }
  };

  // Handle conversation selection - navigate to chat page
  const handleConversationSelect = (session: ChatSession) => {
    router.push(`/chat/${session.id}`);
  };

  // Handle new conversation creation
  const handleNewConversation = () => {
    setShowNewChatModal(true);
  };

  // Session resource management
  const handleAddSessionResource = async (type: 'pdf' | 'website' | 'text', data: any) => {
    // This will be implemented to add resources to the current session
    console.log('Adding resource to session:', { type, data });
  };

  const handleRemoveSessionResource = async (resourceId: string) => {
    // This will be implemented to remove resources from the current session
    console.log('Removing resource from session:', resourceId);
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
        <div className="text-white">Please sign in to access the RAG app.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-6">
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

      {/* Main Content - Conversation List */}
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">My Conversations</h1>
            
            {/* Create New Button */}
            <button
              onClick={handleNewConversation}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>New Conversation</span>
            </button>
          </div>
        </div>

        {/* Conversation List */}
        {appState.sessions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">💬</div>
            <h3 className="text-xl font-semibold mb-2">No conversations yet</h3>
            <p className="text-gray-500 mb-6">Start your first conversation by uploading some resources</p>
            <button
              onClick={handleNewConversation}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Start your first conversation
            </button>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            {/* Table Header */}
            <div className="bg-gray-700 px-6 py-3 grid grid-cols-4 gap-4 text-sm font-medium text-gray-300">
              <div>Title</div>
              <div className="text-center">Sources</div>
              <div className="text-center">Messages</div>
              <div className="text-center">Last Updated</div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-700">
              {appState.sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => handleConversationSelect(session)}
                  className="px-6 py-4 grid grid-cols-4 gap-4 cursor-pointer transition-colors hover:bg-gray-750"
                >
                  {/* Title */}
                  <div className="flex items-center space-x-3 min-w-0">
                    <span className="text-2xl">
                      {session.title.includes('JavaScript') || session.title.includes('JS') ? '👨‍💻' :
                       session.title.includes('Python') ? '🐍' :
                       session.title.includes('React') ? '⚛️' :
                       session.title.includes('Node') ? '🟢' :
                       session.title.includes('API') ? '🔗' :
                       session.title.includes('Database') ? '🗄️' :
                       session.title.includes('AI') || session.title.includes('ML') ? '🤖' :
                       session.title.includes('Web') ? '🌐' :
                       session.title.includes('Mobile') ? '📱' :
                       session.title.includes('Design') ? '🎨' : '📦'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium truncate">{session.title}</h3>
                      <p className="text-sm text-gray-400 truncate">
                        {session.resources.length} resource{session.resources.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Sources */}
                  <div className="text-center flex items-center justify-center">
                    <span className="text-sm">
                      {session.resources.length}
                    </span>
                  </div>

                  {/* Messages */}
                  <div className="text-center flex items-center justify-center">
                    <span className="text-sm">
                      {session.messages.length}
                    </span>
                  </div>

                  {/* Last Updated */}
                  <div className="text-center flex items-center justify-center">
                    <span className="text-sm text-gray-400">
                      {new Date(session.updatedAt).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
