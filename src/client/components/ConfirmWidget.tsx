import { useState } from 'react';

interface ConfirmWidgetProps {
  onAction: (action: string) => void;
}

export default function ConfirmWidget({ onAction }: ConfirmWidgetProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleClick = (action: string) => {
    setSelected(action);
    onAction(action);
  };

  if (selected) {
    return (
      <div className="inline-flex items-center gap-2 text-xs text-gray-500 py-1">
        <span
          className={`w-2 h-2 rounded-full ${
            selected === 'Correct'
              ? 'bg-green-500'
              : selected === 'Not Quite'
                ? 'bg-amber-500'
                : 'bg-gray-400'
          }`}
        />
        {selected}
      </div>
    );
  }

  return (
    <div className="inline-flex gap-2 py-1">
      <button
        onClick={() => handleClick('Correct')}
        className="px-3 py-1.5 text-xs font-medium rounded-md bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
      >
        Correct
      </button>
      <button
        onClick={() => handleClick('Not Quite')}
        className="px-3 py-1.5 text-xs font-medium rounded-md bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
      >
        Not Quite
      </button>
      <button
        onClick={() => handleClick('Skip')}
        className="px-3 py-1.5 text-xs font-medium rounded-md bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors"
      >
        Skip
      </button>
    </div>
  );
}
