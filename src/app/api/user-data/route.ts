import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { deleteVectorsByDocumentId } from '@/lib/vectorService';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'documents', 'chat-sessions', or 'all'

    console.log('User-data API called with type:', type, 'userId:', userId);

    if (type === 'documents' || type === 'all') {
      console.log('Fetching documents for user:', userId);
      // Fetch user's documents
      const documents = await prisma.document.findMany({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          type: true,
          source: true,
          summary: true,
          chunkCount: true,
          createdAt: true,
          updatedAt: true,
        }
      });
      console.log('Documents fetched:', documents.length);

      if (type === 'documents') {
        return NextResponse.json({ documents });
      }
    }

    if (type === 'chat-sessions' || type === 'all') {
      console.log('Fetching chat sessions for user:', userId);
      // Fetch user's chat sessions with message counts
      const chatSessions = await prisma.chatSession.findMany({
        where: { userId: userId },
        orderBy: { updatedAt: 'desc' },
        include: {
          messages: {
            select: {
              id: true,
              role: true,
              content: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'asc' }
          },
          documents: {
            select: {
              id: true,
              name: true,
              type: true,
              source: true,
              summary: true,
              chunkCount: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' }
          },
          _count: {
            select: { messages: true }
          }
        }
      });
      console.log('Chat sessions fetched:', chatSessions.length);

      if (type === 'chat-sessions') {
        return NextResponse.json({ chatSessions });
      }
    }

    if (type === 'all') {
      console.log('Fetching all data for user:', userId);
      // Fetch both documents and chat sessions
      const documents = await prisma.document.findMany({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          type: true,
          source: true,
          summary: true,
          chunkCount: true,
          createdAt: true,
          updatedAt: true,
        }
      });
      console.log('All documents fetched:', documents.length);

      const chatSessions = await prisma.chatSession.findMany({
        where: { userId: userId },
        orderBy: { updatedAt: 'desc' },
        include: {
          messages: {
            select: {
              id: true,
              role: true,
              content: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'asc' }
          },
          documents: {
            select: {
              id: true,
              name: true,
              type: true,
              source: true,
              summary: true,
              chunkCount: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' }
          },
          _count: {
            select: { messages: true }
          }
        }
      });
      console.log('All chat sessions fetched:', chatSessions.length);

      return NextResponse.json({ 
        documents,
        chatSessions,
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          image: session.user.image
        }
      });
    }

    return NextResponse.json({ error: 'Invalid type parameter. Use "documents", "chat-sessions", or "all"' }, { status: 400 });

  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { type, id, chatSessionId } = body;

    if (type === 'document' && id && chatSessionId) {
      // Update document with chat session ID
      const updatedDocument = await prisma.document.update({
        where: {
          id: id,
          userId: userId // Ensure user owns the document
        },
        data: {
          chatSessionId: chatSessionId
        }
      });

      return NextResponse.json({ 
        success: true, 
        document: updatedDocument 
      });
    }

    return NextResponse.json({ error: 'Invalid update request' }, { status: 400 });

  } catch (error) {
    console.error('Error updating user data:', error);
    return NextResponse.json(
      { error: 'Failed to update user data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'document' or 'chat-session'
    const id = searchParams.get('id');

    if (!type || !id) {
      return NextResponse.json({ error: 'Type and ID are required' }, { status: 400 });
    }

    if (type === 'document') {
      // Delete document and associated messages
      const document = await prisma.document.findFirst({
        where: { 
          id: id,
          userId: userId 
        }
      });

      if (!document) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }

      // Delete from vector store first
      try {
        await deleteVectorsByDocumentId(userId, id);
      } catch (vectorError) {
        console.error('Error deleting from vector store:', vectorError);
        // Continue with database deletion even if vector deletion fails
      }

      // Delete from database
      await prisma.document.delete({
        where: { id: id }
      });

      return NextResponse.json({ message: 'Document deleted successfully from both database and vector store' });
    }

    if (type === 'chat-session') {
      // Delete chat session and associated messages
      const chatSession = await prisma.chatSession.findFirst({
        where: { 
          id: id,
          userId: userId 
        }
      });

      if (!chatSession) {
        return NextResponse.json({ error: 'Chat session not found' }, { status: 404 });
      }

      await prisma.chatSession.delete({
        where: { id: id }
      });

      return NextResponse.json({ message: 'Chat session deleted successfully' });
    }

    return NextResponse.json({ error: 'Invalid type parameter. Use "document" or "chat-session"' }, { status: 400 });

  } catch (error) {
    console.error('Error deleting user data:', error);
    return NextResponse.json(
      { error: 'Failed to delete user data' },
      { status: 500 }
    );
  }
}
