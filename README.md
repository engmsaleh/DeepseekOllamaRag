# DeepSeek Ollama RAG

A modern RAG (Retrieval-Augmented Generation) application built with Next.js, Tailwind CSS, and FastAPI, using DeepSeek models via Ollama for local inference.

## Features

- 🚀 **Modern Stack**: Next.js with Tailwind CSS frontend + FastAPI backend
- 📄 **Document Processing**: Upload and process PDF documents
- 🔍 **Semantic Search**: Retrieve relevant information using semantic search
- 💬 **Conversational Interface**: Ask questions about your documents
- 🧠 **Local AI**: Uses Ollama to run DeepSeek models locally
- ⚙️ **Configurable**: Choose between different embedding models and retrieval methods

## Requirements

### Backend
- Python 3.9+
- Ollama installed with DeepSeek model
- All Python packages listed in `backend/requirements.txt`

### Frontend
- Node.js 18+
- npm or yarn

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd DeepseekOllamaRag
```

### 2. Install Ollama (if not already installed)

Follow the instructions at [ollama.ai](https://ollama.ai) to install Ollama for your platform.

Then pull the DeepSeek model:

```bash
ollama pull deepseek-coder:7b-instruct
# Or another compatible model like:
# ollama pull deepseek:7b-instruct
```

### 3. Set Up the Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows, use: venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Set Up the Frontend

```bash
cd frontend
npm install
```

## Running the Application

### 1. Start Ollama

Make sure Ollama is running in the background:

```bash
ollama serve
```

### 2. Start the Backend API

```bash
cd backend
source venv/bin/activate  # On Windows, use: venv\Scripts\activate
uvicorn app.main:app --reload
```

The API will be available at http://localhost:8000

### 3. Start the Frontend

```bash
cd frontend
npm run dev
```

The web application will be available at http://localhost:3000

## Usage

1. Open the application in your browser
2. Upload a PDF document in the sidebar
3. Wait for the document to be processed
4. Ask questions about the document in the chat interface
5. Get AI-generated answers based on the document content

## Advanced Configuration

In the settings panel, you can configure:
- **Embedding Model**: Choose between different embedding models for document chunking
- **Retriever Type**: Select similarity search or MMR (Maximum Marginal Relevance)
- **LLM Model**: Choose which Ollama model to use for answering questions

## API Endpoints

- `GET /`: Health check endpoint
- `GET /status`: Check if Ollama is running
- `POST /upload`: Upload and process a document
- `GET /document/status/{session_id}`: Check document processing status
- `POST /question`: Ask a question about the document

## Architecture

### Backend
- FastAPI for the API framework
- LangChain for document processing and RAG components
- HuggingFace embeddings for semantic chunking and retrieval
- Ollama for running the DeepSeek language model locally

### Frontend
- Next.js for the React framework
- Tailwind CSS for styling
- TypeScript for type safety

## License

MIT
