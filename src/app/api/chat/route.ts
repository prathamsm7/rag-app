import { NextRequest, NextResponse } from 'next/server';
import { QdrantVectorStore } from '@langchain/qdrant';
import { OpenAIEmbeddings } from '@langchain/openai';
import { OpenAI } from 'openai';

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Initialize OpenAI client
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Initialize embeddings
    const embeddings = new OpenAIEmbeddings({
      model: 'text-embedding-3-large',
    });

    // Initialize vector store
    const store = await QdrantVectorStore.fromExistingCollection(
      embeddings,
      {
        url: process.env.QDRANT_URL || 'http://localhost:6333',
        collectionName: 'genai-rag',
      }
    );

    // Create retriever with limited results to stay within token limits
    const vectorStore = store.asRetriever({
      k: 2, // Reduced from 3 to 2 to stay within token limits
    });

    // Retrieve relevant chunks
    const relevantChunks = await vectorStore.invoke(message);

    // Truncate context if it's too long (rough estimate: 4 chars per token)
    const maxContextLength = 6000; // Leave room for system prompt and user message
    let contextString = JSON.stringify(relevantChunks, null, 2);
    
    if (contextString.length > maxContextLength) {
      contextString = contextString.substring(0, maxContextLength) + '... [truncated]';
    }

    // Create system prompt with context
    const systemPrompt = `
You are an AI assistant who helps resolve user queries based on the context available to you from the indexed documents.

Instructions:
- Only answer based on the available context from the documents with the page number mentioned in the context or source of the information (uploaded resources/uploaded files/uploaded website/ not from local file system) .
- If the context doesn't contain enough information to answer the question, say sorry for the inconvenience and ask the user to provide more information or source of the information.
- Be helpful and provide detailed answers when possible and do not provide any information that is not in the context.
- If you're unsure about something, mention it and ask the user to provide more information or source of the information.

Context from documents:
${contextString}
`;

    // Generate response using OpenAI
    const response = await client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    return NextResponse.json({
      response: response.choices[0].message.content,
    });

  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
