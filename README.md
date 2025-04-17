# DeepSeek Ollama RAG

A Retrieval-Augmented Generation (RAG) system built with DeepSeek R1 running locally via Ollama.

## Blog Reference
Original tutorial: [Setting up Ollama & running DeepSeek R1 locally for a powerful RAG system](https://dev.to/ajmal_hasan/setting-up-ollama-running-deepseek-r1-locally-for-a-powerful-rag-system-4pd4)

## Overview

This application demonstrates a Retrieval-Augmented Generation (RAG) system using:
- DeepSeek R1 1.5B model running locally via Ollama
- Streamlit for the web interface
- LangChain for the RAG pipeline
- HuggingFace embeddings for vector search
- FAISS for vector storage

## Features

- PDF document upload and processing
- Semantic chunking of documents
- Vector-based retrieval of relevant content
- Question answering based on document content
- Clean user interface with responsive design

## Setup Instructions

### Prerequisites

- Python 3.11+ recommended
- [Ollama](https://ollama.ai/) installed locally
- DeepSeek R1 model pulled in Ollama

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/DeepseekOllamaRag.git
   cd DeepseekOllamaRag
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Make sure you have the DeepSeek R1 model in Ollama:
   ```bash
   ollama pull deepseek-r1:1.5b
   ```

## Usage

1. Start the Streamlit application:
   ```bash
   streamlit run app.py
   ```

2. Open your browser and navigate to the URL displayed in the terminal (typically http://localhost:8501)

3. Upload a PDF document using the file uploader

4. Ask questions about the document in the text input field

## How It Works

The application implements a complete RAG (Retrieval-Augmented Generation) pipeline with these components:

### Document Processing
1. PDF document is loaded using `PDFPlumberLoader`
2. Document is split into semantic chunks using `SemanticChunker` from LangChain Experimental
   - Unlike traditional chunking that splits by character count, semantic chunking preserves meaning
3. Chunks are embedded using HuggingFace embeddings to convert text into vector representations

### Vector Database (FAISS)
- Facebook AI Similarity Search (FAISS) is used as the vector database
- FAISS enables efficient similarity search and clustering of dense vectors
- Document vectors are stored in-memory (no persistence between sessions)
- The system retrieves the top 3 most relevant chunks for each query using similarity search

### Retrieval-Augmented Generation
1. User query is processed to find the most semantically similar document chunks
2. Retrieved chunks provide contextual information related to the question
3. The `RetrievalQA` chain connects the retrieval and generation components
4. Retrieved chunks are combined using the `StuffDocumentsChain` approach (all context in one prompt)
5. DeepSeek R1 model running via Ollama generates answers based on the retrieved context
6. Custom prompt template guides the model to use the context and format responses appropriately

### LLM Integration
- Uses the DeepSeek R1 1.5B parameter model via Ollama
- Local inference provides privacy and eliminates API costs
- The model is instructed to provide concise responses based only on the retrieved context

## License

This project is open source and available under the [MIT License](LICENSE).
