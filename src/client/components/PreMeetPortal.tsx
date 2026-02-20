import { useState, useRef, type DragEvent } from 'react';

interface PreMeetPortalProps {
  sessionId: string;
  onComplete: () => void;
}

interface UploadedFile {
  filename: string;
  summary: string;
}

export default function PreMeetPortal({
  sessionId,
  onComplete,
}: PreMeetPortalProps) {
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (files: FileList) => {
    setUploading(true);
    setError(null);

    const formData = new FormData();
    for (const file of Array.from(files)) {
      formData.append('files', file);
    }

    try {
      const res = await fetch(`/api/sessions/${sessionId}/premeet/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Upload failed');
        return;
      }

      const data = await res.json();
      setUploaded((prev) => [...prev, ...data.uploaded]);
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Pre-Meeting Upload
          </h1>
          <p className="text-gray-500 text-sm">
            Upload any documents that might be helpful for your upcoming data
            configuration session. This helps us prepare and makes the interview
            more efficient.
          </p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
            dragging
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 bg-white hover:border-gray-400'
          }`}
        >
          <svg
            className="w-10 h-10 text-gray-400 mx-auto mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
          <p className="text-sm text-gray-600 mb-1">
            {uploading
              ? 'Uploading...'
              : 'Drag & drop files here, or click to browse'}
          </p>
          <p className="text-xs text-gray-400">
            Excel, CSV, PDF, images, Word documents
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.docx"
          onChange={(e) => e.target.files && handleUpload(e.target.files)}
          className="hidden"
        />

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Uploaded files */}
        {uploaded.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Uploaded files
            </h3>
            <div className="space-y-2">
              {uploaded.map((f, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg"
                >
                  <svg
                    className="w-5 h-5 text-green-500 shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <div className="text-sm font-medium text-gray-800">
                      {f.filename}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {f.summary}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          {uploaded.length > 0 && (
            <button
              onClick={onComplete}
              className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Done — Ready for interview
            </button>
          )}
          <button
            onClick={onComplete}
            className={`${uploaded.length > 0 ? '' : 'flex-1'} py-2 px-4 bg-gray-100 text-gray-600 rounded-md text-sm hover:bg-gray-200 transition-colors`}
          >
            {uploaded.length > 0 ? 'Skip remaining' : 'Skip — start interview without files'}
          </button>
        </div>

        <p className="mt-4 text-xs text-gray-400 text-center">
          Your files are processed securely and used only for this onboarding session.
        </p>
      </div>
    </div>
  );
}
