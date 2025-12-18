
import React, { useRef, useCallback, useState, useEffect } from 'react';
import { PdfIcon, UploadIcon, CsvIcon } from './icons';

interface FileUploadProps {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  acceptedFileType: string;
  label: string;
  description: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  file,
  onFileSelect,
  acceptedFileType,
  label,
  description,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Clear error if file is set from outside (e.g. reset)
  useEffect(() => {
    if (file) {
      setErrorMessage(null);
    }
  }, [file]);

  const validateFile = useCallback((fileToCheck: File) => {
    const acceptedTypes = acceptedFileType.split(',').map(t => t.trim().toLowerCase());
    const fileExtension = `.${fileToCheck.name.split('.').pop()?.toLowerCase()}`;
    const fileMime = fileToCheck.type.toLowerCase();
    
    const isValid = acceptedTypes.some(type => 
        fileExtension === type || 
        fileMime === type
    );

    if (!isValid) {
      const formattedTypes = acceptedTypes.map(t => t.toUpperCase().replace('.', '')).join(' or ');
      setErrorMessage(`Expected ${formattedTypes} file. Received ${fileExtension.toUpperCase().replace('.', '') || 'unknown'}.`);
      return false;
    }
    
    return true;
  }, [acceptedFileType]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      if (validateFile(selectedFile)) {
        onFileSelect(selectedFile);
        setErrorMessage(null);
      } else {
        if (inputRef.current) inputRef.current.value = '';
      }
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
        const droppedFile = event.dataTransfer.files[0];
        if (validateFile(droppedFile)) {
             onFileSelect(droppedFile);
             setErrorMessage(null);
        }
    }
  }, [validateFile, onFileSelect]);

  let FileTypeIcon = UploadIcon;
  if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'pdf') FileTypeIcon = PdfIcon;
      else if (ext === 'csv') FileTypeIcon = CsvIcon;
      else FileTypeIcon = PdfIcon; // Fallback
  }

  const dropZoneClasses = `
    w-full h-52 border-2 rounded-2xl flex flex-col items-center justify-center cursor-pointer 
    transition-all duration-300 relative overflow-hidden group
    ${errorMessage
        ? 'border-red-500 bg-red-50/50 dark:bg-red-900/10 animate-shake'
        : isDragOver 
            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 scale-[1.02] shadow-xl ring-4 ring-indigo-500/10' 
            : 'border-dashed border-gray-300 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/20 hover:border-indigo-400 hover:bg-white dark:hover:bg-slate-800/40'
    }
    ${file ? 'border-solid border-indigo-500 dark:border-indigo-400 bg-white dark:bg-slate-800/50' : ''}
  `;

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-sm mx-auto">
      <h3 className="text-lg font-bold text-gray-800 dark:text-slate-200 mb-1 transition-colors duration-300">{label}</h3>
      <p className="text-xs text-gray-500 dark:text-slate-400 mb-4 transition-colors duration-300">{description}</p>
      
      <div className="w-full relative">
        <div
            className={dropZoneClasses}
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            aria-label={`Upload ${label} file`}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
        >
            <input
              type="file"
              ref={inputRef}
              onChange={handleFileChange}
              accept={acceptedFileType}
              className="hidden"
              aria-hidden="true"
            />
            
            {/* Visual background effect for drag over */}
            {isDragOver && (
              <div className="absolute inset-0 bg-indigo-500/5 animate-pulse pointer-events-none" />
            )}

            {file ? (
              <div className="text-center p-4 animate-in fade-in zoom-in duration-300" aria-live="polite">
                  <div className="relative inline-block">
                    <FileTypeIcon />
                    <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-0.5 shadow-sm">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                  </div>
                  <p className="mt-3 font-bold text-gray-800 dark:text-slate-200 truncate max-w-[200px] mx-auto">{file.name}</p>
                  <p className="text-[10px] font-mono text-gray-400 dark:text-slate-500 uppercase">{(file.size / 1024).toFixed(1)} KB</p>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onFileSelect(null); if(inputRef.current) inputRef.current.value = ''; }}
                    className="mt-3 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-red-500 transition-colors uppercase tracking-wider"
                  >
                    Change File
                  </button>
              </div>
            ) : (
              <div className="text-center px-6 transition-transform duration-300 group-hover:scale-105">
                  <div className={`transition-colors duration-300 ${errorMessage ? 'text-red-400' : isDragOver ? 'text-indigo-600' : 'text-gray-400 dark:text-slate-500'}`}>
                    <UploadIcon />
                  </div>
                  <p className={`mt-2 text-sm font-semibold transition-colors ${errorMessage ? 'text-red-500' : 'text-gray-600 dark:text-slate-300'}`}>
                      {errorMessage ? 'Invalid File Type' : isDragOver ? 'Drop to Upload' : 'Choose File'}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">
                    Drag and drop or click to browse
                  </p>
              </div>
            )}
        </div>
        {errorMessage && (
            <div className="absolute -bottom-7 left-0 w-full text-center">
                <p className="text-[11px] text-red-500 dark:text-red-400 font-bold bg-red-50 dark:bg-red-900/20 py-0.5 rounded-full border border-red-100 dark:border-red-900/30 px-2 inline-block mx-auto shadow-sm">
                  {errorMessage}
                </p>
            </div>
        )}
      </div>
    </div>
  );
};
