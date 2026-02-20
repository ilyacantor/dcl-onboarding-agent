import { useRef, useState, type DragEvent } from 'react';
import type { PendingFile } from '../hooks/useFileUpload';

interface FileDropZoneProps {
  pendingFiles: PendingFile[];
  processing: boolean;
  onAddFiles: (files: FileList) => void;
  onRemoveFile: (index: number) => void;
}

const ACCEPT =
  '.xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.docx';

export default function FileDropZone({
  pendingFiles,
  processing,
  onAddFiles,
  onRemoveFile,
}: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  };

  const handleDragOut = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) {
      onAddFiles(e.dataTransfer.files);
    }
  };

  return (
    <div
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className="relative"
    >
      {/* Drag overlay */}
      {dragging && (
        <div className="absolute inset-0 z-10 bg-blue-50 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center">
          <span className="text-blue-600 font-medium text-sm">
            Drop files here
          </span>
        </div>
      )}

      {/* Pending files display */}
      {pendingFiles.length > 0 && (
        <div className="flex gap-2 px-3 py-2 overflow-x-auto">
          {pendingFiles.map((pf, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-2.5 py-1.5 text-xs shrink-0"
            >
              {pf.preview ? (
                <img
                  src={pf.preview}
                  alt=""
                  className="w-6 h-6 rounded object-cover"
                />
              ) : (
                <span className="text-gray-400">
                  {getFileIcon(pf.file.name)}
                </span>
              )}
              <span className="text-gray-700 max-w-24 truncate">
                {pf.file.name}
              </span>
              <button
                onClick={() => onRemoveFile(i)}
                className="text-gray-400 hover:text-red-500 ml-1"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Processing indicator */}
      {processing && (
        <div className="px-3 py-1.5 text-xs text-gray-500">
          Processing your file...
        </div>
      )}

      {/* Add file button */}
      <button
        onClick={() => inputRef.current?.click()}
        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        title="Attach file"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        onChange={(e) => e.target.files && onAddFiles(e.target.files)}
        className="hidden"
      />
    </div>
  );
}

function getFileIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'xlsx':
    case 'xls':
    case 'csv':
      return '\u{1F4CA}';
    case 'pdf':
      return '\u{1F4C4}';
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
      return '\u{1F5BC}';
    default:
      return '\u{1F4CE}';
  }
}
