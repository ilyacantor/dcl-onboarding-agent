import { useState } from 'react';

interface TreeNode {
  name: string;
  children?: TreeNode[];
}

interface InlineHierarchyProps {
  title: string;
  root: TreeNode;
}

export default function InlineHierarchy({ title, root }: InlineHierarchyProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden my-2">
      {title && (
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-600">
          {title}
        </div>
      )}
      <div className="px-3 py-2">
        <TreeNodeView node={root} depth={0} />
      </div>
    </div>
  );
}

function TreeNodeView({ node, depth }: { node: TreeNode; depth: number }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-1 py-0.5 hover:bg-gray-50 rounded cursor-default"
        style={{ paddingLeft: `${depth * 20}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600 shrink-0"
          >
            <svg
              className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        ) : (
          <span className="w-4 h-4 flex items-center justify-center shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
          </span>
        )}
        {/* Connecting line */}
        {depth > 0 && (
          <span className="text-gray-300 text-xs mr-1">&mdash;</span>
        )}
        <span className="text-sm text-gray-800">{node.name}</span>
      </div>

      {expanded &&
        hasChildren &&
        node.children!.map((child, i) => (
          <TreeNodeView key={i} node={child} depth={depth + 1} />
        ))}
    </div>
  );
}
