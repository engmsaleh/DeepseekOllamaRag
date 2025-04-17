import React, { useState, useRef } from 'react';
import { uploadDocument } from '../api/api';

interface DocumentUploaderProps {
  onUpload: (file: File) => void;
  isProcessing: boolean;
  isOllamaRunning: boolean;
}

const DocumentUploader: React.FC<DocumentUploaderProps> = ({ onUpload, isProcessing, isOllamaRunning }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Handle drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  // Handle drop event
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0] && !isProcessing && isOllamaRunning) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        setSelectedFile(file);
        onUpload(file);
      } else {
        alert('Please upload a PDF file.');
      }
    }
  };
  
  // Handle file input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    if (e.target.files && e.target.files[0] && !isProcessing && isOllamaRunning) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf') {
        setSelectedFile(file);
        onUpload(file);
      } else {
        alert('Please upload a PDF file.');
      }
    }
  };
  
  // Handle button click
  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };
  
  // Generate status message
  const getStatusMessage = () => {
    if (!isOllamaRunning) {
      return 'Waiting for Ollama to start...';
    }
    
    if (isProcessing) {
      return 'Processing document...';
    }
    
    if (selectedFile) {
      return `${selectedFile.name} uploaded successfully`;
    }
    
    return 'Drop PDF or click to browse';
  };
  
  const isDisabled = isProcessing || !isOllamaRunning;
  
  return (
    <div className="flex flex-col">
      <div className="text-md font-semibold text-gray-800 mb-1 flex items-center gap-1">
        <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        Document Upload
      </div>
      
      <div 
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors duration-200 p-3 ${
          dragActive 
            ? 'border-indigo-400 bg-indigo-50' 
            : isDisabled 
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed' 
              : 'border-gray-300 bg-white hover:border-indigo-300 hover:bg-indigo-50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="application/pdf"
          onChange={handleChange}
          disabled={isDisabled}
        />
        
        <div className="flex flex-col items-center text-center">
          {/* Icon based on status */}
          {isProcessing ? (
            <div className="mb-1 text-indigo-500 animate-pulse">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
            </div>
          ) : !isOllamaRunning ? (
            <div className="mb-1 text-red-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          ) : selectedFile ? (
            <div className="mb-1 text-green-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          ) : (
            <div className="mb-1 text-gray-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
              </svg>
            </div>
          )}
          
          <p className={`text-xs ${
            isProcessing 
              ? 'text-indigo-600' 
              : !isOllamaRunning 
                ? 'text-red-600' 
                : selectedFile 
                  ? 'text-green-600' 
                  : 'text-gray-600'
          }`}>
            {getStatusMessage()}
          </p>
          
          {!selectedFile && !isProcessing && !isDisabled && (
            <button
              type="button"
              onClick={handleButtonClick}
              className="mt-2 inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-indigo-500"
              disabled={isDisabled}
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
              </svg>
              Browse
            </button>
          )}
          
          {isProcessing && (
            <div className="mt-1 w-full max-w-xs bg-gray-200 rounded-full h-1 overflow-hidden">
              <div className="bg-indigo-600 h-1 rounded-full animate-progress"></div>
            </div>
          )}
        </div>
      </div>
      
      {selectedFile && !isProcessing && (
        <div className="mt-1 flex justify-end">
          <button
            onClick={() => {
              setSelectedFile(null);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }}
            className="inline-flex items-center px-2 py-1 text-xs text-indigo-700 bg-indigo-50 rounded-md hover:bg-indigo-100"
          >
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
            Clear
          </button>
        </div>
      )}
    </div>
  );
};

export default DocumentUploader; 