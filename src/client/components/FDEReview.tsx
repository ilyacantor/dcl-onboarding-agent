import { useState, useEffect } from 'react';
import InlineTable from './InlineTable';
import InlineHierarchy from './InlineHierarchy';

interface ContourMap {
  organizational_hierarchy: any[];
  sor_authority_map: any[];
  conflict_register: any[];
  management_overlay: any[];
  vocabulary_map: any[];
  priority_queries: any[];
  follow_up_tasks: any[];
  uploaded_artifacts: any[];
  metadata: {
    version: string;
    created: string;
    last_updated: string;
    completeness_score: number;
  };
}

interface FDEReviewProps {
  sessionId: string;
  onBack: () => void;
}

export default function FDEReview({ sessionId, onBack }: FDEReviewProps) {
  const [contourMap, setContourMap] = useState<ContourMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reviewerName, setReviewerName] = useState('');
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}/contour`)
      .then((res) => res.json())
      .then((data) => {
        setContourMap(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [sessionId]);

  const handleApprove = async () => {
    setApproving(true);
    setStatus(null);
    try {
      const res = await fetch(
        `/api/sessions/${sessionId}/contour/approve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reviewer_name: reviewerName,
            reviewer_notes: reviewerNotes,
          }),
        },
      );
      const data = await res.json();
      if (res.ok) {
        setContourMap(data.contour_map);
        setStatus({ type: 'success', message: 'Contour map approved!' });
      } else {
        setStatus({ type: 'error', message: data.error });
      }
    } catch {
      setStatus({ type: 'error', message: 'Failed to approve' });
    } finally {
      setApproving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setStatus(null);
    try {
      const res = await fetch(
        `/api/sessions/${sessionId}/contour/export`,
        { method: 'POST' },
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus({
          type: 'success',
          message: `Exported to DCL! Graph: ${data.graph_id}, ${data.nodes_created} nodes, ${data.edges_created} edges`,
        });
      } else {
        setStatus({
          type: 'error',
          message: data.error || 'Export failed',
        });
      }
    } catch {
      setStatus({ type: 'error', message: 'Failed to export' });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading contour map...</div>
      </div>
    );
  }

  if (!contourMap) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-500">Failed to load contour map</div>
      </div>
    );
  }

  const isApproved = contourMap.metadata.version.includes('approved');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div>
            <button
              onClick={onBack}
              className="text-sm text-blue-600 hover:text-blue-700 mb-1"
            >
              &larr; Back to sessions
            </button>
            <h1 className="text-xl font-bold text-gray-900">
              FDE Review — Contour Map
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                isApproved
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {isApproved ? 'Approved' : 'Pending Review'}
            </span>
            <span className="text-sm text-gray-500">
              {contourMap.metadata.completeness_score}% complete
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Status banner */}
        {status && (
          <div
            className={`p-3 rounded-lg text-sm ${
              status.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {status.message}
          </div>
        )}

        {/* Organizational Hierarchy */}
        <Section title="Organizational Hierarchy" count={contourMap.organizational_hierarchy.length}>
          {contourMap.organizational_hierarchy.length > 0 ? (
            <InlineHierarchy
              title=""
              root={{
                name: 'Organization',
                children: contourMap.organizational_hierarchy.map(nodeToTree),
              }}
            />
          ) : (
            <Empty />
          )}
        </Section>

        {/* SOR Authority Map */}
        <Section title="Systems of Record" count={contourMap.sor_authority_map.length}>
          {contourMap.sor_authority_map.length > 0 ? (
            <InlineTable
              title=""
              headers={['Dimension', 'System', 'Confidence', 'Notes']}
              rows={contourMap.sor_authority_map.map((e: any) => [
                e.dimension,
                e.system,
                `${Math.round((e.confidence || 0) * 100)}%`,
                e.notes || '',
              ])}
            />
          ) : (
            <Empty />
          )}
        </Section>

        {/* Conflicts */}
        <Section title="Conflict Register" count={contourMap.conflict_register.length}>
          {contourMap.conflict_register.length > 0 ? (
            <InlineTable
              title=""
              headers={['Dimension', 'Systems', 'Status', 'Resolution']}
              rows={contourMap.conflict_register.map((c: any) => [
                c.dimension,
                c.systems?.map((s: any) => `${s.system}: ${s.value}`).join(' vs ') || '',
                c.status,
                c.resolution || '—',
              ])}
            />
          ) : (
            <Empty text="No conflicts recorded" />
          )}
        </Section>

        {/* Management Overlay */}
        <Section title="Management Overlay" count={contourMap.management_overlay.length}>
          {contourMap.management_overlay.length > 0 ? (
            <InlineHierarchy
              title=""
              root={{
                name: 'Management View',
                children: contourMap.management_overlay.map(nodeToTree),
              }}
            />
          ) : (
            <Empty />
          )}
        </Section>

        {/* Vocabulary */}
        <Section title="Vocabulary Map" count={contourMap.vocabulary_map.length}>
          {contourMap.vocabulary_map.length > 0 ? (
            <InlineTable
              title=""
              headers={['Term', 'Meaning', 'Context', 'System Equivalent']}
              rows={contourMap.vocabulary_map.map((v: any) => [
                v.term,
                v.meaning,
                v.context || '',
                v.system_equivalent || '—',
              ])}
            />
          ) : (
            <Empty />
          )}
        </Section>

        {/* Priority Queries */}
        <Section title="Priority Queries" count={contourMap.priority_queries.length}>
          {contourMap.priority_queries.length > 0 ? (
            <InlineTable
              title=""
              headers={['Question', 'Context', 'Frequency', 'Priority']}
              rows={contourMap.priority_queries.map((q: any) => [
                q.question,
                q.business_context || '',
                q.frequency || '',
                String(q.priority || 0),
              ])}
            />
          ) : (
            <Empty />
          )}
        </Section>

        {/* Follow-up Tasks */}
        <Section title="Follow-up Tasks" count={contourMap.follow_up_tasks.length}>
          {contourMap.follow_up_tasks.length > 0 ? (
            <InlineTable
              title=""
              headers={['Description', 'Assigned To', 'Status']}
              rows={contourMap.follow_up_tasks.map((t: any) => [
                t.description,
                t.assigned_to || '—',
                t.status,
              ])}
            />
          ) : (
            <Empty text="No follow-up tasks" />
          )}
        </Section>

        {/* Approval form */}
        {!isApproved && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4">
              Approve Contour Map
            </h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Reviewer name"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                placeholder="Review notes (optional)"
                value={reviewerNotes}
                onChange={(e) => setReviewerNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleApprove}
                disabled={approving || !reviewerName}
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {approving ? 'Approving...' : 'Approve for Production'}
              </button>
            </div>
          </div>
        )}

        {/* Export to DCL */}
        {isApproved && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Export to DCL
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Push the approved contour map to DCL to build the semantic graph.
            </p>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {exporting ? 'Exporting...' : 'Export to DCL'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        <span className="text-xs text-gray-400">{count} items</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Empty({ text = 'No data captured' }: { text?: string }) {
  return <p className="text-sm text-gray-400 italic">{text}</p>;
}

function nodeToTree(node: any): { name: string; children?: any[] } {
  return {
    name: node.name || node.id,
    children: node.children?.length > 0 ? node.children.map(nodeToTree) : undefined,
  };
}
