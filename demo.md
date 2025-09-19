# RAG Application Demo

## Quick Start

1. **Set up environment**:
   ```bash
   # Copy the example environment file
   cp .env.example .env.local
   
   # Edit .env.local and add your OpenAI API key
   # OPENAI_API_KEY=your_actual_api_key_here
   ```

2. **Start Qdrant vector database**:
   ```bash
   npm run qdrant:up
   ```

3. **Start the application**:
   ```bash
   npm run dev
   ```

4. **Open your browser**:
   Navigate to `http://localhost:3000`

## Demo Flow

### Step 1: Index Data
1. **Text Input**: Select "Text Input" and enter some text about a topic
2. **File Upload**: Select "Upload Files" and upload a PDF file
3. **Website**: Select "Website URL" and enter a URL to scrape
4. Click "Submit" to index the data

### Step 2: Chat with Data
1. Once data is indexed, the RAG Store will show a green checkmark
2. Use the chat interface to ask questions about your indexed data
3. The AI will respond based on the context from your indexed documents

## Features Demonstrated

✅ **Data Source (TextArea)** - Enter text directly  
✅ **Upload Files** - Support for PDF files  
✅ **Website Input** - Scrape content from URLs  
✅ **RAG Store** - Visual indicator of indexing status  
✅ **Chat Interface** - Ask questions about your data  
✅ **Clean UI** - Modern, responsive design  
✅ **Smooth Workflow** - Intuitive user experience  

## Architecture

- **Frontend**: Next.js 15 with App Router
- **Backend**: Next.js API routes
- **Vector DB**: Qdrant (Docker)
- **Embeddings**: OpenAI text-embedding-3-large
- **LLM**: OpenAI GPT-4
- **Document Processing**: LangChain

## Troubleshooting

- Ensure Qdrant is running: `docker ps | grep qdrant`
- Check OpenAI API key is set correctly
- Verify file uploads are PDF format
- Check browser console for errors
