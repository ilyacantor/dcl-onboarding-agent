import { useState, useEffect } from 'react';
import { useSession } from './hooks/useSession';
import { useWebSocket, type WSMessage } from './hooks/useWebSocket';
import { useFileUpload } from './hooks/useFileUpload';
import ChatWindow from './components/ChatWindow';
import ProgressTracker from './components/ProgressTracker';
import PreMeetPortal from './components/PreMeetPortal';
import FDEReview from './components/FDEReview';

interface ChatMessage {
  id: string;
  role: 'AGENT' | 'STAKEHOLDER';
  content: string;
  rich_content?: unknown[];
  timestamp: Date;
}

export default function App() {
  const {
    session,
    sessions,
    loading,
    createSession,
    fetchSessions,
    selectSession,
    updateFromMessage,
  } = useSession();

  const { connected, typing, messages: wsMessages, send } = useWebSocket(
    session?.id ?? null,
  );

  const fileUpload = useFileUpload();

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    stakeholder_name: '',
    stakeholder_role: '',
  });

  // Check if this is a pre-meeting upload portal URL (/premeet/:sessionId)
  const [preMeetSessionId, setPreMeetSessionId] = useState<string | null>(() => {
    const match = window.location.pathname.match(/^\/premeet\/(.+)$/);
    return match ? match[1] : null;
  });

  // FDE review mode
  const [reviewSessionId, setReviewSessionId] = useState<string | null>(() => {
    const match = window.location.pathname.match(/^\/review\/(.+)$/);
    return match ? match[1] : null;
  });

  // Load sessions on mount
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Load existing messages when session is selected
  useEffect(() => {
    if (!session) return;
    fetch(`/api/sessions/${session.id}/messages`)
      .then((res) => res.json())
      .then((msgs: any[]) => {
        setChatMessages(
          msgs.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            rich_content: m.rich_content,
            timestamp: new Date(m.timestamp),
          })),
        );
      });
  }, [session?.id]);

  // Process incoming WebSocket messages
  useEffect(() => {
    if (wsMessages.length === 0) return;
    const latest = wsMessages[wsMessages.length - 1];

    if (latest.type === 'agent_message' && latest.content) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `ws-${Date.now()}`,
          role: 'AGENT',
          content: latest.content!,
          rich_content: latest.rich_content,
          timestamp: new Date(),
        },
      ]);

      updateFromMessage({
        section: latest.section,
        session_status: latest.session_status,
        contour_completeness: latest.contour_completeness,
      });
    }
  }, [wsMessages.length]);

  const handleSend = (text: string) => {
    if (!text.trim() && fileUpload.pendingFiles.length === 0) return;

    // Add stakeholder message to chat
    setChatMessages((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        role: 'STAKEHOLDER',
        content: text,
        timestamp: new Date(),
      },
    ]);

    // Send via WebSocket
    const payload: any = {
      type: 'stakeholder_message',
      content: text,
    };

    if (fileUpload.pendingFiles.length > 0) {
      payload.files = fileUpload.getFilesForWS();
      fileUpload.clearFiles();
    }

    send(payload);
  };

  const handleConfirmAction = (action: string) => {
    handleSend(action);
  };

  const handleComparisonResolve = (
    dimension: string,
    system: string,
    resolution: string,
  ) => {
    handleSend(
      `For ${dimension}: ${resolution === 'neither' ? 'Neither system is correct' : `${system} is the correct source`}`,
    );
  };

  // FDE Review page
  if (reviewSessionId) {
    return (
      <FDEReview
        sessionId={reviewSessionId}
        onBack={() => {
          setReviewSessionId(null);
          window.history.pushState({}, '', '/');
        }}
      />
    );
  }

  // Pre-meeting upload portal
  if (preMeetSessionId) {
    return (
      <PreMeetPortal
        sessionId={preMeetSessionId}
        onComplete={() => {
          setPreMeetSessionId(null);
          window.history.pushState({}, '', '/');
        }}
      />
    );
  }

  // Session create/select screen
  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            DCL Onboarding Agent
          </h1>

          {/* Existing sessions */}
          {sessions.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-medium text-gray-500 mb-3">
                Resume session
              </h2>
              <div className="space-y-2">
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => selectSession(s.id)}
                    className="w-full text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <div className="font-medium">{s.customer_name}</div>
                    <div className="text-sm text-gray-500">
                      {s.stakeholder_name} &middot; {s.status}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Create new session */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-sm font-medium text-gray-500 mb-4">
              New interview session
            </h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Customer ID"
                value={formData.customer_id}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, customer_id: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Customer Name"
                value={formData.customer_name}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, customer_name: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Stakeholder Name"
                value={formData.stakeholder_name}
                onChange={(e) =>
                  setFormData((f) => ({
                    ...f,
                    stakeholder_name: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Stakeholder Role (e.g., VP Finance)"
                value={formData.stakeholder_role}
                onChange={(e) =>
                  setFormData((f) => ({
                    ...f,
                    stakeholder_role: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => createSession(formData)}
                disabled={
                  loading ||
                  !formData.customer_name ||
                  !formData.stakeholder_name
                }
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Creating...' : 'Start Interview'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main chat interface
  return (
    <div className="h-screen flex bg-gray-50">
      {/* Chat area (75%) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-14 border-b border-gray-200 bg-white flex items-center px-4 shrink-0">
          <div className="flex-1">
            <span className="font-semibold text-gray-900">
              {session.customer_name}
            </span>
            <span className="text-gray-400 mx-2">&middot;</span>
            <span className="text-sm text-gray-500">
              {session.stakeholder_name} ({session.stakeholder_role})
            </span>
          </div>
          <div className="flex items-center gap-3">
            {session.status === 'COMPLETE' && (
              <button
                onClick={() => {
                  setReviewSessionId(session.id);
                  window.history.pushState({}, '', `/review/${session.id}`);
                }}
                className="px-3 py-1 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 transition-colors"
              >
                FDE Review
              </button>
            )}
            <span
              className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}
            />
            <span className="text-xs text-gray-400">
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Chat window */}
        <ChatWindow
          messages={chatMessages}
          typing={typing}
          onSend={handleSend}
          onConfirmAction={handleConfirmAction}
          onComparisonResolve={handleComparisonResolve}
          fileUpload={fileUpload}
        />
      </div>

      {/* Sidebar (25%) */}
      <div className="w-72 border-l border-gray-200 bg-white shrink-0 hidden lg:block overflow-y-auto">
        <ProgressTracker
          currentSection={session.current_section}
          sectionStatus={session.section_status}
          completeness={session.contour_completeness}
          sessionStatus={session.status}
        />
      </div>
    </div>
  );
}
