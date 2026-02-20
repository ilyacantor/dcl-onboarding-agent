interface InlineTableProps {
  title: string;
  headers: string[];
  rows: string[][];
}

export default function InlineTable({ title, headers, rows }: InlineTableProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden my-2">
      {title && (
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-600">
          {title}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 bg-gray-50"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr
                key={ri}
                className={`border-b border-gray-100 ${ri % 2 === 1 ? 'bg-gray-50/50' : ''}`}
              >
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-1.5 text-gray-700">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
