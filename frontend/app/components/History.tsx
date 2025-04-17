import React from 'react';

interface HistoryProps {
  currentDocument: string | null;
}

const History: React.FC<HistoryProps> = ({ currentDocument }) => {
  // Placeholder for history functionality
  // In a real app, this would be fetched from an API
  
  return (
    <div className="mt-3">
      <div className="text-md font-semibold text-gray-800 mb-1 flex items-center gap-1">
        <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        Document History
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-2">
        {currentDocument ? (
          <div className="border-l-2 border-indigo-500 pl-2 py-0.5">
            <div className="text-xs font-medium text-gray-800 truncate">
              {currentDocument}
            </div>
            <div className="text-xs text-gray-500">Current document</div>
          </div>
        ) : (
          <div className="text-xs text-gray-500 italic">
            No documents in history
          </div>
        )}
      </div>
    </div>
  );
};

export default History; 