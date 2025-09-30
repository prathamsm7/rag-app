import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { processChatRequest } from '@/lib/chatService';
import { getOrCreateChatSession, saveMessage } from '@/lib/sessionService';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = session.user.id;
    const { message, chatSessionId, documentIds, createSession, sessionTitle } = await request.json();

    // Validate request
    if (!message && !createSession) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    // Get or create chat session
    const chatSession = await getOrCreateChatSession(
      userId,
      chatSessionId,
      createSession && sessionTitle ? sessionTitle : undefined
    );

    // If only creating session, return early
    if (!message) {
      return NextResponse.json({
        chatSessionId: chatSession.id,
        sessionCreated: true
      });
    }

    // Process chat request
    const chatResponse = await processChatRequest(userId, {
      message,
      chatSessionId: chatSession.id,
      documentIds: documentIds || []
    });

    // Save messages to database
    const userMessage = await saveMessage(
      chatSession.id,
      'user',
      message,
      documentIds?.[0]
    );

    const assistantMessage = await saveMessage(
      chatSession.id,
      'assistant',
      chatResponse.response,
      documentIds?.[0]
    );

    return NextResponse.json({
      response: chatResponse.response,
      chatSessionId: chatSession.id,
      messageId: assistantMessage.id,
      userMessageId: userMessage.id,
      sessionCreated: createSession || false
    });

  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      {
        error: 'Failed to process chat request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}