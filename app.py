import streamlit as st
import warnings
import logging
import requests
import json
import os
from requests.exceptions import ConnectionError

# Suppress PyTorch warning about torch.__path__._path more aggressively
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
from langchain_core.output_parsers.string import StrOutputParser
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains.retrieval import create_retrieval_chain
from langchain_core.runnables import RunnablePassthrough

# Function to check if Ollama is running
def is_ollama_running():
    try:
        response = requests.get("http://localhost:11434/api/tags", timeout=2)
        return response.status_code == 200
    except (ConnectionError, requests.exceptions.RequestException):
        return False

# Page configuration
st.set_page_config(page_title="DeepSeek RAG Chat", layout="wide", initial_sidebar_state="expanded")

# Check Ollama availability
ollama_running = is_ollama_running()

# Initialize session state
if "messages" not in st.session_state:
    st.session_state.messages = []
if "retrieval_chain" not in st.session_state:
    st.session_state.retrieval_chain = None
if "document_processed" not in st.session_state:
    st.session_state.document_processed = False
if "debug_mode" not in st.session_state:
    st.session_state.debug_mode = False
if "should_rerun" not in st.session_state:
    st.session_state.should_rerun = False

# Add initial message about Ollama status if not running
if not ollama_running:
    st.session_state.messages.append({
        "role": "system", 
        "content": "⚠️ Warning: Ollama is not running. Please start Ollama before processing documents."
    })

# Define custom CSS for a ChatGPT-like interface
st.markdown("""
<style>
    /* Main Background - Dark Mode */
    .stApp {
        background-color: #202123;
        color: #FFFFFF;
    }
    
    /* Sidebar Styling */
    [data-testid="stSidebar"] {
        background-color: #343541 !important;
        color: #FFFFFF !important;
        border-right: 1px solid #4D4D4F;
    }
    [data-testid="stSidebar"] * {
        color: #FFFFFF !important;
    }
    
    /* Chat Message Container */
    .chat-message {
        padding: 1.5rem;
        display: flex;
        margin-bottom: 0;
    }
    
    /* User Message Styling */
    .user-message {
        background-color: #343541;
        border-bottom: 1px solid #4D4D4F;
    }
    
    /* AI Message Styling */
    .ai-message {
        background-color: #444654;
        border-bottom: 1px solid #4D4D4F;
    }
    
    /* Message Content */
    .message-content {
        display: flex;
        flex-direction: row;
        align-items: flex-start;
        width: 100%;
        max-width: 900px;
        margin: 0 auto;
    }
    
    /* Avatar Container */
    .avatar {
        display: flex;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 5px;
        margin-right: 20px;
        background-color: #5437DB;
        align-items: center;
        font-size: 20px;
    }
    
    .user-avatar {
        background-color: #5437DB;
    }
    
    .ai-avatar {
        background-color: #19AA6E;
    }
    
    /* Message Text Container */
    .message-text {
        flex-grow: 1;
        padding-top: 8px;
    }
    
    /* Input Area Styling */
    .input-container {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 1rem;
        background-color: #343541;
        border-top: 1px solid #4D4D4F;
        z-index: 100;
        margin-left: var(--sidebar-width);
    }
    
    .input-area {
        display: flex;
        max-width: 900px;
        margin: 0 auto;
    }
    
    /* Headings */
    h1, h2, h3, h4, h5, h6 {
        color: #FFFFFF !important;
        font-weight: bold;
    }
    
    /* Custom header for chat */
    .chat-header {
        text-align: center;
        padding: 1rem 0;
        border-bottom: 1px solid #4D4D4F;
        margin-bottom: 1rem;
    }
    
    /* Adjust content height to make space for input area */
    .main-content {
        margin-bottom: 90px;  /* Height of input container */
    }
    
    /* File uploader */
    .stFileUploader > div > div > div > button {
        background-color: #5437DB;
        color: #FFFFFF;
        font-weight: bold;
        border-radius: 5px;
    }
    
    /* Status indicators */
    .status-indicator {
        padding: 0.5rem;
        border-radius: 5px;
        font-weight: bold;
        text-align: center;
        margin: 1rem 0;
    }
    
    .success {
        background-color: rgba(25, 170, 110, 0.2);
        color: #19AA6E;
    }
    
    .info {
        background-color: rgba(84, 55, 219, 0.2);
        color: #5437DB;
    }
    
    .error {
        background-color: rgba(219, 55, 55, 0.2);
        color: #FF5252;
    }
    
    .spinner {
        display: inline-block;
        margin-right: 0.5rem;
    }
    
    /* Streamlit Chat Message Styling */
    [data-testid="stChatMessage"] {
        background-color: #444654 !important;
        border-radius: 8px !important;
        margin-bottom: 10px !important;
        padding: 10px !important;
    }
    
    /* Code Block Styling */
    pre {
        background-color: #1E1E1E !important;
        border-radius: 4px !important;
        padding: 8px !important;
    }
    
    code {
        font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace !important;
    }
</style>
""", unsafe_allow_html=True)

# Sidebar for PDF upload and processing
with st.sidebar:
    st.title("Document RAG")
    
    # Debug mode toggle
    st.session_state.debug_mode = st.checkbox("Debug Mode", value=st.session_state.debug_mode)
    
    # Document upload section
    st.header("📄 Upload Document")
    uploaded_file = st.file_uploader("Upload your PDF file", type="pdf")
    
    st.markdown("---")
    
    # Settings section
    with st.expander("Settings"):
        st.header("Settings")
        st.markdown("""
        - **Embedding Model**: HuggingFace
        - **Retriever Type**: Similarity Search
        - **LLM**: DeepSeek R1 (Ollama)
        """)
    
    st.markdown("---")
    
    st.header("Instructions")
    st.markdown("""
    1. Upload a PDF document
    2. Wait for processing to complete
    3. Ask questions about the document
    4. Get AI responses based on the content
    """)
    
    # Process document when uploaded
    if uploaded_file and not st.session_state.document_processed:
        # Check if Ollama is running before processing
        if not is_ollama_running():
            st.error("Ollama is not running. Please start Ollama before processing documents.")
            st.info("Run Ollama, then refresh this page to try again.")
        else:
            with st.spinner("Processing document..."):
                try:
                    # Save the uploaded file
                    with open("temp.pdf", "wb") as f:
                        f.write(uploaded_file.getvalue())
                    
                    # Load the PDF
                    loader = PDFPlumberLoader("temp.pdf")
                    docs = loader.load()
                    
                    # Split the document into chunks
                    embeddings_model = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
                    text_splitter = SemanticChunker(embeddings_model)
                    documents = text_splitter.split_documents(docs)
                    
                    # Create vector store and retriever
                    vector = FAISS.from_documents(documents, embeddings_model)
                    retriever = vector.as_retriever(search_type="similarity", search_kwargs={"k": 3})
                    
                    # Define the LLM and the prompt
                    try:
                        llm = OllamaLLM(model="deepseek-r1:1.5b")
                    except Exception as llm_error:
                        st.error(f"Failed to connect to Ollama: {llm_error}")
                        st.error("Make sure Ollama is running and the model is downloaded. Run 'ollama pull deepseek-r1:1.5b' to download the model.")
                        st.session_state.document_processed = False
                        st.stop()  # Stop execution of the Streamlit app

                    prompt = """
                    1. Use the following pieces of context to answer the question at the end.
                    2. If you don't know the answer, just say that "I don't know" but don't make up an answer on your own.\n
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
                    
                    # Define a custom retrieval chain with input transformation to handle both input formats
                    def create_custom_retrieval_chain(retriever, combine_docs_chain):
                        # This ensures that the "question" variable will be consistently used in the prompt template
                        def format_inputs(inputs):
                            # Handle inputs with either "question" or "input" as the query key
                            if "question" in inputs:
                                question = inputs["question"]
                            elif "input" in inputs:
                                question = inputs["input"]
                            else:
                                raise ValueError("Input must contain either 'question' or 'input' key")
                            
                            # Return with standardized question key
                            return {"question": question}

                        # Construct the retrieval chain with the input transformation
                        retrieval_chain = (
                            RunnablePassthrough.assign(
                                context=lambda x: retriever.invoke(
                                    x.get("question", x.get("input", ""))
                                )
                            )
                            | combine_docs_chain
                        )
                        
                        # Wrap the chain with our input formatter
                        return {"format_inputs": format_inputs, "chain": retrieval_chain}

                    # Create custom retrieval chain
                    retrieval_chain_data = create_custom_retrieval_chain(
                        retriever=retriever,
                        combine_docs_chain=stuff_documents_chain
                    )

                    # Store both the input formatter and the chain in session state
                    st.session_state.retrieval_chain_formatter = retrieval_chain_data["format_inputs"]
                    st.session_state.retrieval_chain = retrieval_chain_data["chain"]
                    
                    st.session_state.document_processed = True
                    
                    # Add a system message to chat
                    st.session_state.messages.append({
                        "role": "system", 
                        "content": f"Document '{uploaded_file.name}' has been processed successfully. You can now ask questions about it."
                    })
                    
                    st.success("Document processed successfully!")
                    
                except Exception as e:
                    error_message = f"Error: {str(e)}"
                    st.session_state.messages.append({
                        "role": "system", 
                        "content": f'<div class="status-indicator error">{error_message}</div>'
                    })
                    # Set rerun flag to True after adding error message
                    st.session_state.should_rerun = True
                    if st.session_state.debug_mode:
                        import traceback
                        trace = traceback.format_exc()
                        st.session_state.messages.append({
                            "role": "system",
                            "content": f'<div class="status-indicator error">Debug Error:</div>\n```\n{trace}\n```'
                        })

# Main chat area
st.markdown('<div class="main-content">', unsafe_allow_html=True)

# Display chat header
if st.session_state.document_processed:
    st.markdown('<div class="chat-header"><h2>DeepSeek RAG Assistant</h2></div>', unsafe_allow_html=True)
else:
    # Show welcome message if no document is processed
    st.markdown('<div class="chat-header"><h2>DeepSeek RAG Assistant</h2></div>', unsafe_allow_html=True)
    if not uploaded_file:
        st.markdown(
            '<div class="status-indicator info">'
            'Please upload a PDF document in the sidebar to start'
            '</div>',
            unsafe_allow_html=True
        )

# Display chat messages - using Streamlit's native chat components
for message in st.session_state.messages:
    if message["role"] == "user":
        with st.chat_message("user"):
            st.markdown(message["content"])
    elif message["role"] == "assistant":
        with st.chat_message("assistant"):
            st.markdown(message["content"])
    elif message["role"] == "system":
        st.markdown(
            f'<div class="status-indicator success">{message["content"]}</div>',
            unsafe_allow_html=True
        )

st.markdown('</div>', unsafe_allow_html=True)

# Input area at the bottom
st.markdown('<div class="input-container"><div class="input-area">', unsafe_allow_html=True)
with st.container():
    # Create a form for the chat input
    with st.form(key="question_form", clear_on_submit=True):
        user_input = st.text_input("Ask a question about your document:", key="question_input")
        submit_button = st.form_submit_button("Send")
    
    if submit_button and user_input:
        # Add user message to chat
        st.session_state.messages.append({"role": "user", "content": user_input})
        
        if st.session_state.retrieval_chain is not None:
            try:
                # Try both input key formats to handle different chain versions
                try:
                    # Use our formatter to standardize input
                    if hasattr(st.session_state, "retrieval_chain_formatter"):
                        formatted_input = st.session_state.retrieval_chain_formatter({"input": user_input})
                        response = st.session_state.retrieval_chain.invoke(formatted_input)
                    else:
                        # Fallback for older sessions without the formatter
                        response = st.session_state.retrieval_chain.invoke({"question": user_input})
                except Exception as chain_error:
                    # If the above fails, try direct invocation with input key as a last resort
                    if "Input to PromptTemplate is missing variables" in str(chain_error):
                        response = st.session_state.retrieval_chain.invoke({"input": user_input})
                    else:
                        raise
                
                # Debug: Log the response structure
                if st.session_state.debug_mode:
                    debug_info = f"Response type: {type(response)}\n"
                    if isinstance(response, dict):
                        debug_info += f"Keys: {list(response.keys())}\n"
                        debug_info += f"Content: {json.dumps(response, default=str, indent=2)}"
                    else:
                        debug_info += f"Content: {str(response)}"
                    
                    st.session_state.messages.append({
                        "role": "system",
                        "content": f"Debug Info:\n```\n{debug_info}\n```"
                    })
                
                # Check response structure and extract answer
                if isinstance(response, dict):
                    # Try different possible keys based on the chain's output structure
                    if "answer" in response:
                        ai_response = response["answer"]
                    elif "result" in response:
                        ai_response = response["result"]
                    elif "output" in response:
                        ai_response = response["output"]
                    elif "response" in response:
                        ai_response = response["response"]
                    else:
                        # If no known keys are found, convert the whole response to string
                        ai_response = str(response)
                else:
                    # If response is not a dictionary, convert it to string
                    ai_response = str(response)
                    
                # Add AI response to chat
                st.session_state.messages.append({"role": "assistant", "content": ai_response})
                # Set rerun flag to True after adding response
                st.session_state.should_rerun = True
            except Exception as e:
                error_message = f"Error: {str(e)}"
                st.session_state.messages.append({
                    "role": "system", 
                    "content": f'<div class="status-indicator error">{error_message}</div>'
                })
                # Set rerun flag to True after adding error message
                st.session_state.should_rerun = True
                if st.session_state.debug_mode:
                    import traceback
                    trace = traceback.format_exc()
                    st.session_state.messages.append({
                        "role": "system",
                        "content": f'<div class="status-indicator error">Debug Error:</div>\n```\n{trace}\n```'
                    })
        else:
            st.session_state.messages.append({"role": "assistant", "content": "Please upload and process a document first."})
            # Set rerun flag for this case too
            st.session_state.should_rerun = True

st.markdown('</div></div>', unsafe_allow_html=True)

# Check if we need to rerun the app to update the UI with new messages
if st.session_state.should_rerun:
    # Reset the flag to prevent infinite loops
    st.session_state.should_rerun = False
    # Rerun the app to show the messages
    st.rerun()


