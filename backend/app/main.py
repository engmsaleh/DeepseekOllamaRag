import os
import warnings
import logging
import json
import tempfile
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests

# Suppress PyTorch warnings
os.environ["PYTHONWARNINGS"] = "ignore::UserWarning"
warnings.filterwarnings("ignore", message=".*Tried to instantiate class '__path__._path'.*")
warnings.filterwarnings("ignore", category=UserWarning)
logging.getLogger("torch").setLevel(logging.ERROR)
logging.getLogger("torch.__path__").setLevel(logging.ERROR)

# Import after warnings are suppressed
from langchain_community.document_loaders import PDFPlumberLoader
from langchain_experimental.text_splitter import SemanticChunker
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_ollama import OllamaLLM
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain.chains.combine_documents import create_stuff_documents_chain

# Create FastAPI app
app = FastAPI(title="DeepSeek RAG API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global storage for document processing state
# In production, use a proper database
document_store = {}

# Pydantic Models
class QuestionRequest(BaseModel):
    question: str
    session_id: str
    include_reasoning: bool = False

class DocumentProcessResponse(BaseModel):
    session_id: str
    status: str
    message: str

class QuestionResponse(BaseModel):
    answer: str
    thinking: Optional[str] = None

def is_ollama_running():
    """Check if Ollama API is running"""
    try:
        response = requests.get("http://localhost:11434/api/tags", timeout=2)
        return response.status_code == 200
    except Exception:
        return False

def get_or_create_session_store(session_id: str) -> Dict:
    """Get or create a new session store for document and chain storage"""
    if session_id not in document_store:
        document_store[session_id] = {
            "status": "none",
            "retrieval_chain": None,
            "processor": None,
            "filename": None,
            "error": None
        }
    return document_store[session_id]

async def process_document(session_id: str, file_path: str, filename: str):
    """Process document in background and set up RAG chain"""
    session = get_or_create_session_store(session_id)
    session["status"] = "processing"
    session["filename"] = filename
    
    try:
        if not is_ollama_running():
            session["status"] = "error"
            session["error"] = "Ollama is not running. Please start Ollama before processing documents."
            return
        
        # Load the PDF
        loader = PDFPlumberLoader(file_path)
        docs = loader.load()
        
        # Split the document into chunks
        embeddings_model = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
        text_splitter = SemanticChunker(embeddings_model)
        documents = text_splitter.split_documents(docs)
        
        # Create vector store and retriever
        vector = FAISS.from_documents(documents, embeddings_model)
        retriever = vector.as_retriever(search_type="similarity", search_kwargs={"k": 3})
        
        # Define the LLM and the prompt
        llm = OllamaLLM(model="deepseek-r1:1.5b")
        
        prompt = """
        1. Use the following pieces of context to answer the question at the end.
        2. If you don't know the answer, just say that "I don't know" but don't make up an answer on your own.
        3. Keep the answer clear and concise.
        Context: {context}
        Question: {question}
        Helpful Answer:"""
        prompt_template = PromptTemplate.from_template(prompt)
        
        # Create the document chain
        document_prompt = PromptTemplate(
            input_variables=["page_content", "source"],
            template="Content: {page_content}\nSource: {source}",
        )
        
        # Create stuff documents chain
        stuff_documents_chain = create_stuff_documents_chain(
            llm=llm,
            prompt=prompt_template,
            document_variable_name="context",
            document_prompt=document_prompt
        )
        
        # Define a custom retrieval chain that handles input format properly
        def create_custom_retrieval_chain(retriever, combine_docs_chain):
            def format_inputs(inputs):
                if "question" in inputs:
                    question = inputs["question"]
                elif "input" in inputs:
                    question = inputs["input"]
                else:
                    raise ValueError("Input must contain either 'question' or 'input' key")
                
                return {"question": question}

            # Create retrieval chain
            retrieval_chain = (
                RunnablePassthrough.assign(
                    context=lambda x: retriever.invoke(
                        x.get("question", x.get("input", ""))
                    )
                )
                | combine_docs_chain
            )
            
            return {"format_inputs": format_inputs, "chain": retrieval_chain}

        # Create the retrieval chain
        retrieval_chain_data = create_custom_retrieval_chain(
            retriever=retriever,
            combine_docs_chain=stuff_documents_chain
        )
        
        # Store the formatted retrieval chain in the session
        session["retrieval_chain_formatter"] = retrieval_chain_data["format_inputs"]
        session["retrieval_chain"] = retrieval_chain_data["chain"]
        session["status"] = "completed"
        
    except Exception as e:
        session["status"] = "error"
        session["error"] = str(e)

@app.get("/")
async def root():
    """API health check endpoint"""
    return {"message": "DeepSeek RAG API is running"}

@app.get("/status")
async def check_ollama():
    """Check if Ollama is running"""
    return {"ollama_running": is_ollama_running()}

@app.post("/upload", response_model=DocumentProcessResponse)
async def upload_document(
    background_tasks: BackgroundTasks, 
    file: UploadFile = File(...),
    session_id: str = Query(None)
):
    """Upload and process a document"""
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID is required")
    
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    # Create temporary file
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
    try:
        # Write uploaded file to temp file
        content = await file.read()
        temp_file.write(content)
        temp_file.close()
        
        # Process document in background
        session = get_or_create_session_store(session_id)
        session["status"] = "uploaded"
        
        background_tasks.add_task(
            process_document, 
            session_id=session_id, 
            file_path=temp_file.name,
            filename=file.filename
        )
        
        return {
            "session_id": session_id,
            "status": "processing",
            "message": f"Document '{file.filename}' uploaded and is being processed"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/document/status/{session_id}")
async def document_status(session_id: str):
    """Check document processing status"""
    session = get_or_create_session_store(session_id)
    return {
        "session_id": session_id,
        "status": session["status"],
        "filename": session["filename"],
        "error": session["error"]
    }

@app.post("/question", response_model=QuestionResponse)
async def ask_question(request: QuestionRequest):
    """Ask a question about the processed document"""
    session = get_or_create_session_store(request.session_id)
    
    if session["status"] != "completed":
        if session["status"] == "error":
            raise HTTPException(status_code=400, detail=f"Error processing document: {session['error']}")
        else:
            raise HTTPException(status_code=400, detail="Document processing not completed")
    
    if not session["retrieval_chain"]:
        raise HTTPException(status_code=400, detail="No document has been processed for this session")
    
    try:
        # Format the input and get response
        formatted_input = session["retrieval_chain_formatter"]({"input": request.question})
        response = session["retrieval_chain"].invoke(formatted_input)
        
        # Extract answer from response
        if isinstance(response, dict):
            # Try different possible keys
            if "answer" in response:
                answer = response["answer"]
            elif "result" in response:
                answer = response["result"]
            elif "output" in response:
                answer = response["output"]
            elif "response" in response:
                answer = response["response"]
            else:
                answer = str(response)
        else:
            answer = str(response)
        
        # Attempt to separate reasoning and final answer if requested
        if request.include_reasoning:
            # Simple heuristic to separate reasoning from answer
            # This is a basic implementation - in a real app you'd want something more sophisticated
            result = {}
            
            # If response contains "Final Answer:" or similar delimiter
            if isinstance(answer, str) and "\n\nFinal Answer:" in answer:
                parts = answer.split("\n\nFinal Answer:")
                result = {
                    "thinking": parts[0].strip(),
                    "answer": "Final Answer:" + parts[1].strip()
                }
            elif isinstance(answer, str) and answer.count("\n\n") > 0:
                # If multiple paragraphs, assume last paragraph is the answer
                paragraphs = answer.split("\n\n")
                result = {
                    "thinking": "\n\n".join(paragraphs[:-1]),
                    "answer": paragraphs[-1]
                }
            else:
                # No clear separation, return everything as the answer
                result = {"answer": answer}
            
            return result
        else:
            # Just return the answer
            return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing question: {str(e)}")

# Run with: uvicorn app.main:app --reload
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 