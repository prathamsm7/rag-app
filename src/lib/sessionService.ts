/**
 * Session management service for chat sessions
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ChatSession {
  id: string;
  userId: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  chatSessionId: string;
  documentId: string | null;
  role: string;
  content: string;
  createdAt: Date;
}

/**
 * Create a new chat session
 */
export async function createChatSession(
  userId: string,
  title?: string
): Promise<ChatSession> {
  const sessionTitle = title || 'New Chat';
  
  const chatSession = await prisma.chatSession.create({
    data: {
      userId,
      title: sessionTitle,
    },
  });

  console.log(`Created chat session: ${chatSession.id} with title: ${sessionTitle}`);
  return chatSession;
}

/**
 * Find an existing chat session
 */
export async function findChatSession(
  sessionId: string,
  userId: string
): Promise<ChatSession | null> {
  const chatSession = await prisma.chatSession.findFirst({
    where: {
      id: sessionId,
      userId: userId,
    },
  });

  return chatSession;
}

/**
 * Save a message to the database
 */
export async function saveMessage(
  chatSessionId: string,
  role: 'user' | 'assistant',
  content: string,
  documentId?: string
): Promise<Message> {
  const message = await prisma.message.create({
    data: {
      chatSessionId,
      role,
      content,
      documentId: documentId || null,
    },
  });

  // Update session's updatedAt timestamp
  await prisma.chatSession.update({
    where: { id: chatSessionId },
    data: { updatedAt: new Date() },
  });

  return message;
}

/**
 * Get or create a chat session
 */
export async function getOrCreateChatSession(
  userId: string,
  sessionId?: string,
  title?: string
): Promise<ChatSession> {
  if (sessionId) {
    const existingSession = await findChatSession(sessionId, userId);
    if (existingSession) {
      return existingSession;
    }
  }

  // Create new session if not found or not provided
  return await createChatSession(userId, title);
}
