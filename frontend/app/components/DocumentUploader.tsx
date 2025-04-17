import React, { useState, useCallback } from 'react';
import { uploadDocument } from '../api/api';

interface DocumentUploaderProps {
  onUpload: (message: string) => void;
  onUploadStart: () => void;
  disabled: boolean;
}

const DocumentUploader: React.FC<DocumentUploaderProps> = ({ 
  onUpload, 
  onUploadStart,
  disabled 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    handleFiles(files);
  }, [disabled]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || !e.target.files?.length) return;
    handleFiles(e.target.files);
    // Reset the input value to allow uploading the same file again
    e.target.value = '';
  }, [disabled]);
  
  const handleFiles = async (fileList: FileList) => {
    const file = fileList[0];
    
    // Check if the file is a PDF
    if (!file.type.includes('pdf')) {
      onUpload('Error: Only PDF files are supported');
      return;
    }
    
    try {
      setUploadProgress(0);
      onUploadStart();
      
      // Simulating progress for better UX
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev === null) return 0;
          return prev >= 90 ? 90 : prev + 10;
        });
      }, 500);
      
      const message = await uploadDocument(file);
      
      clearInterval(interval);
      setUploadProgress(100);
      
      // Inform parent component of successful upload
      onUpload(message);
      
      // Clear progress after a short delay
      setTimeout(() => setUploadProgress(null), 1500);
    } catch (error) {
      setUploadProgress(null);
      onUpload(`Error uploading document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="w-full p-4">
      <div 
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 
          'border-gray-300 dark:border-gray-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (!disabled) {
            document.getElementById('file-upload')?.click();
          }
        }}
      >
        <input
          id="file-upload"
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleFileInput}
          disabled={disabled}
        />
        
        <div className="flex flex-col items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          
          <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
            {isDragging ? "Drop your PDF here" : "Drag & drop a PDF file, or click to browse"}
          </p>
          
          <p className="text-xs text-gray-500 mt-1">Only PDF files are supported</p>
          
          {uploadProgress !== null && (
            <div className="w-full max-w-xs mt-4">
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold inline-block text-indigo-600">
                      {uploadProgress === 100 ? 'Complete' : 'Uploading...'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold inline-block text-indigo-600">
                      {uploadProgress}%
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 text-xs flex rounded bg-indigo-200">
                  <div 
                    style={{ width: `${uploadProgress}%` }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500 transition-all duration-500"
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentUploader; 