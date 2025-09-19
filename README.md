# RAG Application

A Retrieval Augmented Generation (RAG) application built with Next.js App Router that allows users to upload files, input text, or scrape websites, then chat with the indexed data using AI.

## Features

- **Split-Panel Interface**:
  - Sources panel on the left for file management
  - Chat container on the right for AI interaction
- **Multiple Data Sources**:
  - PDF file upload with automatic processing
  - Website URL scraping and indexing
- **Resource Management**:
  - Visual file list with selection controls
  - Automatic resource summaries
  - Multi-source selection for chat queries
- **Smart Text Chunking**: Automatically splits large documents into manageable chunks
- **Vector Storage**: Uses Qdrant for vector embeddings storage
- **AI Chat Interface**: Chat with your data using OpenAI GPT-4
- **Suggested Queries**: Pre-built question prompts to get started
- **Token Management**: Intelligent context truncation to stay within model limits
- **Modern UI**: Clean, responsive interface matching the design specification

## Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- OpenAI API key

## Setup

1. **Clone and install dependencies**:
   ```bash
   cd rag-app
   npm install
   ```

2. **Set up environment variables**:
   Create a `.env.local` file in the root directory:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   QDRANT_URL=http://localhost:6333
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

3. **Start Qdrant vector database**:
   ```bash
   npm run qdrant:up
   ```
   This will start Qdrant on `http://localhost:6333`

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser**:
   Navigate to `http://localhost:3000`

## Usage

1. **Add Sources**:
   - Click "+ Add" in the Sources panel
   - Upload PDF files or add website URLs
   - Sources will be automatically indexed and summarized

2. **Manage Sources**:
   - View all uploaded sources in the left panel
   - Select/deselect sources for chat queries
   - Use "Select all sources" to toggle all at once

3. **Chat with Data**:
   - Use the chat interface on the right
   - Ask questions about your selected sources
   - Try suggested queries to get started
   - Get AI-powered responses based on your data

## API Endpoints

- `POST /api/index` - Index documents from various sources and generate summaries
- `POST /api/chat` - Chat with indexed data

## Docker Commands

- `npm run qdrant:up` - Start Qdrant database
- `npm run qdrant:down` - Stop Qdrant database  
- `npm run qdrant:logs` - View Qdrant logs

## Supported File Types

- PDF files (with automatic text chunking)
- Website URLs (scraped content with chunking)
- Direct text input (with chunking)

## Architecture

- **Frontend**: Next.js 15 with App Router, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes
- **Vector Database**: Qdrant
- **Embeddings**: OpenAI text-embedding-3-large
- **LLM**: OpenAI GPT-4
- **Document Processing**: LangChain

## Development

The application follows the requirements from the provided specification:

1. ✅ Data Source (TextArea) to enter text
2. ✅ Upload option to upload files (PDF, CSV, etc)
3. ✅ RAG Store where the data is indexed
4. ✅ Chat window to ask queries from the stored data
5. ✅ Both File upload and Website input as data sources
6. ✅ Proper chunking, indexing and retrieval implemented
7. ✅ Clean UI and smooth workflow

## Troubleshooting

- Ensure Qdrant is running before starting the app
- Check that your OpenAI API key is valid
- Verify file uploads are in supported formats
- Check browser console for any errors