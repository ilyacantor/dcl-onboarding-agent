interface MessageBubbleProps {
  role: 'AGENT' | 'STAKEHOLDER';
  content: string;
}

export default function MessageBubble({ role, content }: MessageBubbleProps) {
  const isAgent = role === 'AGENT';

  return (
    <div className={`flex ${isAgent ? 'justify-start' : 'justify-end'} mb-3`}>
      <div
        className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isAgent
            ? 'bg-gray-100 text-gray-900 rounded-bl-md'
            : 'bg-blue-600 text-white rounded-br-md'
        }`}
      >
        {content}
      </div>
    </div>
  );
}
