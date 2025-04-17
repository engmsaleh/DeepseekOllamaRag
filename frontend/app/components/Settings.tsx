import React, { useState } from 'react';

interface SettingsProps {
  isOllamaRunning: boolean;
  onDebugModeChange?: (enabled: boolean) => void;
}

const Settings: React.FC<SettingsProps> = ({ isOllamaRunning, onDebugModeChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  const handleDebugModeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setDebugMode(isChecked);
    if (onDebugModeChange) {
      onDebugModeChange(isChecked);
    }
  };

  return (
    <div className="mt-3">
      <div className="text-md font-semibold text-gray-800 mb-1 flex items-center gap-1">
        <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
        </svg>
        Settings
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-3 py-2 flex justify-between items-center text-left transition-colors hover:bg-gray-50 focus:outline-none"
        >
          <span className="text-xs font-medium text-gray-700">Configuration</span>
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isExpanded && (
          <div className="px-3 py-2 border-t border-gray-200">
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-500 mb-0">Embedding Model</p>
                <p className="text-xs font-medium text-gray-700">sentence-transformers/all-MiniLM-L6-v2</p>
              </div>
              
              <div>
                <p className="text-xs text-gray-500 mb-0">Retriever Type</p>
                <p className="text-xs font-medium text-gray-700">FAISS (Similarity Search)</p>
              </div>
              
              <div>
                <p className="text-xs text-gray-500 mb-0">LLM</p>
                <p className="text-xs font-medium text-gray-700 flex items-center">
                  DeepSeek R1 1.5B
                  <span className={`ml-2 w-2 h-2 rounded-full ${isOllamaRunning ? 'bg-green-500' : 'bg-red-500'}`}></span>
                </p>
              </div>
              
              <div className="pt-1 border-t border-gray-100">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={debugMode}
                    onChange={handleDebugModeChange}
                    className="w-3 h-3 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                  />
                  <span className="ml-1 text-xs text-gray-700">Debug Mode</span>
                </label>
                {debugMode && (
                  <p className="mt-0.5 text-xs text-gray-500">Shows reasoning steps alongside answers</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-2">
        <div className="text-xs font-medium text-gray-800 mb-1">Instructions</div>
        <div className="text-xs text-gray-600 space-y-0.5">
          <p>1. Upload a PDF document</p>
          <p>2. Wait for processing to complete</p>
          <p>3. Ask questions about the document</p>
          <p>4. AI will search for answers in the document</p>
        </div>
      </div>
    </div>
  );
};

export default Settings; 