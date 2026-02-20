interface ProgressTrackerProps {
  currentSection: string;
  sectionStatus: Record<string, string>;
  completeness: number;
  sessionStatus: string;
}

const SECTIONS = [
  { id: '1', label: 'Business Overview', time: '10-15 min' },
  { id: '2', label: 'System Authority', time: '5-10 min' },
  { id: '3', label: 'Dimensional Walkthrough', time: '25-30 min' },
  { id: '4', label: 'Management Reporting', time: '10 min' },
  { id: '5', label: 'Pain Points', time: '10 min' },
];

export default function ProgressTracker({
  currentSection,
  sectionStatus,
  completeness,
  sessionStatus,
}: ProgressTrackerProps) {
  return (
    <div className="p-4">
      {/* Completeness */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-500">
            Contour Map
          </span>
          <span className="text-sm font-semibold text-gray-900">
            {completeness}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 rounded-full h-2 transition-all duration-500"
            style={{ width: `${completeness}%` }}
          />
        </div>
      </div>

      {/* Session status */}
      <div className="mb-4">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            sessionStatus === 'COMPLETE'
              ? 'bg-green-100 text-green-700'
              : sessionStatus === 'PAUSED'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-blue-100 text-blue-700'
          }`}
        >
          {sessionStatus === 'IN_PROGRESS'
            ? 'In Progress'
            : sessionStatus.charAt(0) + sessionStatus.slice(1).toLowerCase()}
        </span>
      </div>

      {/* Sections */}
      <div className="space-y-1">
        <h3 className="text-xs font-medium text-gray-500 mb-2">Sections</h3>
        {SECTIONS.map((section) => {
          const status = sectionStatus[section.id] || 'NOT_STARTED';
          const isCurrent = currentSection === section.id;

          return (
            <div
              key={section.id}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                isCurrent ? 'bg-blue-50' : ''
              }`}
            >
              <StatusIcon status={status} isCurrent={isCurrent} />
              <div className="flex-1 min-w-0">
                <div
                  className={`text-sm ${
                    isCurrent
                      ? 'font-medium text-blue-900'
                      : status === 'COMPLETE'
                        ? 'text-gray-600'
                        : 'text-gray-700'
                  }`}
                >
                  {section.label}
                </div>
                <div className="text-xs text-gray-400">{section.time}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusIcon({
  status,
  isCurrent,
}: {
  status: string;
  isCurrent: boolean;
}) {
  if (status === 'COMPLETE') {
    return (
      <svg
        className="w-5 h-5 text-green-500 shrink-0"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  if (isCurrent || status === 'IN_PROGRESS') {
    return (
      <div className="w-5 h-5 shrink-0 flex items-center justify-center">
        <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'PARKED') {
    return (
      <svg
        className="w-5 h-5 text-amber-400 shrink-0"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  // NOT_STARTED
  return (
    <div className="w-5 h-5 shrink-0 flex items-center justify-center">
      <div className="w-2.5 h-0.5 bg-gray-300 rounded" />
    </div>
  );
}
