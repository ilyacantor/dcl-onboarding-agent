import { useState, useCallback } from 'react';

export interface SessionInfo {
  id: string;
  customer_name: string;
  stakeholder_name: string;
  stakeholder_role: string;
  status: string;
  current_section: string;
  section_status: Record<string, string>;
  contour_completeness: number;
}

export interface SessionListItem {
  id: string;
  customer_name: string;
  stakeholder_name: string;
  status: string;
  created_at: string;
}

interface UseSessionReturn {
  session: SessionInfo | null;
  sessions: SessionListItem[];
  loading: boolean;
  error: string | null;
  createSession: (data: {
    customer_id: string;
    customer_name: string;
    stakeholder_name: string;
    stakeholder_role: string;
  }) => Promise<SessionInfo>;
  fetchSessions: () => Promise<void>;
  selectSession: (id: string) => Promise<void>;
  updateFromMessage: (data: {
    section?: string;
    session_status?: string;
    contour_completeness?: number;
  }) => void;
}

export function useSession(): UseSessionReturn {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/sessions');
      const data = await res.json();
      setSessions(data);
    } catch (err) {
      setError('Failed to load sessions');
    }
  }, []);

  const createSession = useCallback(
    async (data: {
      customer_id: string;
      customer_name: string;
      stakeholder_name: string;
      stakeholder_role: string;
    }): Promise<SessionInfo> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const session = await res.json();
        const info: SessionInfo = {
          id: session.id,
          customer_name: session.customer_name,
          stakeholder_name: session.stakeholder_name,
          stakeholder_role: session.stakeholder_role,
          status: session.status,
          current_section: session.current_section,
          section_status: session.section_status || {},
          contour_completeness: 0,
        };
        setSession(info);
        return info;
      } catch (err) {
        setError('Failed to create session');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const selectSession = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${id}`);
      const data = await res.json();
      const info: SessionInfo = {
        id: data.id,
        customer_name: data.customer_name,
        stakeholder_name: data.stakeholder_name,
        stakeholder_role: data.stakeholder_role,
        status: data.status,
        current_section: data.current_section,
        section_status: data.section_status || {},
        contour_completeness: data.contour_completeness ?? 0,
      };
      setSession(info);
    } catch (err) {
      setError('Failed to load session');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateFromMessage = useCallback(
    (data: {
      section?: string;
      session_status?: string;
      contour_completeness?: number;
    }) => {
      setSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          ...(data.section && { current_section: data.section }),
          ...(data.session_status && { status: data.session_status }),
          ...(data.contour_completeness !== undefined && {
            contour_completeness: data.contour_completeness,
          }),
        };
      });
    },
    [],
  );

  return {
    session,
    sessions,
    loading,
    error,
    createSession,
    fetchSessions,
    selectSession,
    updateFromMessage,
  };
}
