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

    // Check for required environment variables
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    if (!process.env.QDRANT_URL) {
      return NextResponse.json({ error: 'Qdrant URL not configured' }, { status: 500 });
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
    const qdrantConfig: any = {
      url: process.env.QDRANT_URL,
      collectionName: 'rag-app',
    };

    // Add API key for Qdrant Cloud if available
    if (process.env.QDRANT_API_KEY) {
      qdrantConfig.apiKey = process.env.QDRANT_API_KEY;
    }

    let store;
    try {
      store = await QdrantVectorStore.fromExistingCollection(
        embeddings,
        qdrantConfig
      );
    } catch (error) {
      console.error('Error connecting to Qdrant:', error);
      return NextResponse.json({ 
        error: 'Unable to connect to vector database. Please ensure Qdrant is running and properly configured.' 
      }, { status: 500 });
    }

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
- Answer based on the available context from the documents. Mention the source of information when possible.
- If the context contains relevant information, provide a helpful and detailed answer.
- If the context doesn't contain enough information to fully answer the question, provide what information is available and mention that more details might be needed.
- Be helpful and informative while staying grounded in the provided context.

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
