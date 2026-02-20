import { useState } from 'react';

interface SystemValue {
  system: string;
  value: string;
  is_match?: boolean;
}

interface ComparisonViewProps {
  dimension: string;
  systems: SystemValue[];
  onResolve: (system: string, resolution: string) => void;
}

export default function ComparisonView({
  dimension,
  systems,
  onResolve,
}: ComparisonViewProps) {
  const [resolved, setResolved] = useState<string | null>(null);

  const handleResolve = (system: string, resolution: string) => {
    setResolved(resolution);
    onResolve(system, resolution);
  };

  // Check if all values match
  const allMatch =
    systems.length > 0 &&
    systems.every((s) => s.value === systems[0].value);

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden my-2">
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-600">
        Comparison: {dimension}
      </div>

      <div className="grid gap-0 divide-y divide-gray-100">
        {systems.map((sys, i) => {
          const isMatch =
            sys.is_match !== undefined ? sys.is_match : allMatch;

          return (
            <div key={i} className="flex items-center gap-3 px-3 py-2">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${isMatch ? 'bg-green-500' : 'bg-amber-500'}`}
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500">{sys.system}</div>
                <div className="text-sm text-gray-900 truncate">
                  {sys.value}
                </div>
              </div>

              {/* Resolution buttons (only for mismatches) */}
              {!isMatch && !resolved && (
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => handleResolve(sys.system, sys.system)}
                    className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                  >
                    This is right
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Neither button */}
      {!allMatch && !resolved && (
        <div className="px-3 py-2 border-t border-gray-100">
          <button
            onClick={() => handleResolve('', 'neither')}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
          >
            Neither is correct
          </button>
        </div>
      )}

      {/* Resolved indicator */}
      {resolved && (
        <div className="px-3 py-2 border-t border-gray-100 text-xs text-green-600">
          Resolved: {resolved === 'neither' ? 'Neither' : resolved}
        </div>
      )}
    </div>
  );
}
