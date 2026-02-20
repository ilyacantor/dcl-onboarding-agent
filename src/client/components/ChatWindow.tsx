import { useState, useRef, useEffect } from 'react';
import type { UseFileUploadReturn } from '../hooks/useFileUpload';
import MessageBubble from './MessageBubble';
import FileDropZone from './FileDropZone';
import InlineTable from './InlineTable';
import InlineHierarchy from './InlineHierarchy';
import ComparisonView from './ComparisonView';
import ConfirmWidget from './ConfirmWidget';

interface ChatMessage {
  id: string;
  role: 'AGENT' | 'STAKEHOLDER';
  content: string;
  rich_content?: unknown[];
  timestamp: Date;
}

interface ChatWindowProps {
  messages: ChatMessage[];
  typing: boolean;
  onSend: (text: string) => void;
  onConfirmAction: (action: string) => void;
  onComparisonResolve: (
    dimension: string,
    system: string,
    resolution: string,
  ) => void;
  fileUpload: UseFileUploadReturn;
}

export default function ChatWindow({
  messages,
  typing,
  onSend,
  onConfirmAction,
  onComparisonResolve,
  fileUpload,
}: ChatWindowProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, typing]);

  const handleSubmit = () => {
    if (!input.trim() && fileUpload.pendingFiles.length === 0) return;
    onSend(input);
    setInput('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Check if the last agent message should show a confirm widget
  const lastAgentMsg =
    messages.length > 0 && messages[messages.length - 1].role === 'AGENT'
      ? messages[messages.length - 1]
      : null;

  const showConfirm =
    lastAgentMsg &&
    !typing &&
    (lastAgentMsg.content.includes('?') ||
      lastAgentMsg.rich_content?.some(
        (rc: any) =>
          rc.type === 'hierarchy' || rc.type === 'table',
      ));

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-20 text-sm">
            Send a message to begin the interview
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id}>
            <MessageBubble role={msg.role} content={msg.content} />

            {/* Render rich content */}
            {msg.rich_content?.map((rc: any, i: number) => (
              <div key={`${msg.id}-rc-${i}`} className="mb-3 ml-2">
                {rc.type === 'table' && (
                  <InlineTable
                    title={rc.title}
                    headers={rc.headers}
                    rows={rc.rows}
                  />
                )}
                {rc.type === 'hierarchy' && (
                  <InlineHierarchy title={rc.title} root={rc.root} />
                )}
                {rc.type === 'comparison' && (
                  <ComparisonView
                    dimension={rc.dimension}
                    systems={rc.systems}
                    onResolve={(system, resolution) =>
                      onComparisonResolve(rc.dimension, system, resolution)
                    }
                  />
                )}
              </div>
            ))}
          </div>
        ))}

        {/* Typing indicator */}
        {typing && (
          <div className="flex justify-start mb-3">
            <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-2.5">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <span
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.1s' }}
                />
                <span
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Confirm widget */}
        {showConfirm && (
          <div className="mb-3 ml-2">
            <ConfirmWidget onAction={onConfirmAction} />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 bg-white px-4 py-3 shrink-0">
        <div className="flex items-end gap-2">
          <FileDropZone
            pendingFiles={fileUpload.pendingFiles}
            processing={fileUpload.processing}
            onAddFiles={(files) => fileUpload.addFiles(files)}
            onRemoveFile={fileUpload.removeFile}
          />
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 resize-none px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-32"
            style={{
              height: 'auto',
              minHeight: '38px',
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 128) + 'px';
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() && fileUpload.pendingFiles.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
