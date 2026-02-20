import Anthropic from '@anthropic-ai/sdk';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

export interface PdfParseResult {
  text_content: string;
  extracted_hierarchy: { name: string; level: number; children: string[] }[];
  extracted_entities: string[];
  document_type: string;
  summary: string;
}

const ENTITY_PATTERNS = [
  /(?:Inc\.|Corp\.|LLC|Ltd\.|GmbH|S\.A\.|N\.V\.|PLC|LP|LLP)/gi,
  /(?:Division|Department|Business Unit|Segment|Region)/gi,
];

const DOC_TYPE_SIGNALS: Record<string, string[]> = {
  '10-K': ['annual report', '10-k', 'form 10-k', 'securities and exchange'],
  '10-Q': ['quarterly report', '10-q', 'form 10-q'],
  'Org Chart': ['organization chart', 'org chart', 'reporting structure'],
  'Chart of Accounts': ['chart of accounts', 'coa', 'account number', 'gl account'],
  'Financial Statement': ['balance sheet', 'income statement', 'cash flow', 'profit and loss'],
};

export async function parsePdf(
  buffer: Buffer,
  filename: string,
): Promise<PdfParseResult> {
  let textContent = '';

  try {
    const result = await pdf(buffer);
    textContent = result.text || '';
  } catch {
    // PDF parsing failed — will fall through to vision if text is short
  }

  // If text extraction yields very little, fall back to Claude vision
  if (textContent.trim().length < 100) {
    return parsePdfWithVision(buffer, filename);
  }

  // Detect document type
  const lowerText = textContent.toLowerCase();
  let documentType = 'Unknown';
  for (const [type, signals] of Object.entries(DOC_TYPE_SIGNALS)) {
    if (signals.some((s) => lowerText.includes(s))) {
      documentType = type;
      break;
    }
  }

  // Extract entity names
  const entities = new Set<string>();
  for (const pattern of ENTITY_PATTERNS) {
    const regex = new RegExp(pattern);
    let match;
    while ((match = regex.exec(textContent)) !== null) {
      // Get surrounding context for the entity
      const start = Math.max(0, match.index - 50);
      const context = textContent.slice(start, match.index + match[0].length);
      // Extract the entity name (words before the suffix)
      const entityMatch = context.match(/([A-Z][\w\s&.-]+(?:Inc\.|Corp\.|LLC|Ltd\.|GmbH|S\.A\.|N\.V\.|PLC|LP|LLP))/);
      if (entityMatch) {
        entities.add(entityMatch[1].trim());
      }
    }
  }

  // Extract hierarchy patterns from indented text
  const hierarchy = extractHierarchyFromText(textContent);

  // Truncate for summary
  const preview = textContent.slice(0, 500).replace(/\s+/g, ' ').trim();
  const summary = `Parsed "${filename}" (${documentType}) — ${textContent.length} chars extracted. ${entities.size} entities found. Preview: ${preview}...`;

  return {
    text_content: textContent,
    extracted_hierarchy: hierarchy,
    extracted_entities: [...entities],
    document_type: documentType,
    summary,
  };
}

function extractHierarchyFromText(
  text: string,
): { name: string; level: number; children: string[] }[] {
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  const hierarchy: { name: string; level: number; children: string[] }[] = [];

  for (const line of lines) {
    const indent = line.search(/\S/);
    const trimmed = line.trim();

    // Look for lines that resemble hierarchy entries
    if (
      trimmed.length > 2 &&
      trimmed.length < 100 &&
      !trimmed.match(/^\d+[\s.)]/) && // skip numbered lists
      indent >= 0
    ) {
      const level = Math.floor(indent / 2);
      // Simple heuristic: lines with consistent indentation patterns
      if (level > 0 && level < 6) {
        hierarchy.push({ name: trimmed, level, children: [] });
      }
    }
  }

  // Link children to parents
  for (let i = 1; i < hierarchy.length; i++) {
    if (hierarchy[i].level > hierarchy[i - 1].level) {
      // Find parent (nearest previous item with lower level)
      for (let j = i - 1; j >= 0; j--) {
        if (hierarchy[j].level < hierarchy[i].level) {
          hierarchy[j].children.push(hierarchy[i].name);
          break;
        }
      }
    }
  }

  // Return only items that have children (likely real hierarchy parents)
  return hierarchy.filter((h) => h.children.length > 0);
}

async function parsePdfWithVision(
  buffer: Buffer,
  filename: string,
): Promise<PdfParseResult> {
  const anthropic = new Anthropic();
  const base64 = buffer.toString('base64');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          } as any,
          {
            type: 'text',
            text: `Extract structured information from this PDF document "${filename}". Return:
1. Any organizational hierarchy (divisions, departments, entities)
2. Entity names (companies, business units)
3. Document type (10-K, org chart, chart of accounts, etc.)
4. Key content summary

Format as plain text, with hierarchy items indented to show parent-child relationships.`,
          },
        ],
      },
    ],
  });

  const text =
    response.content[0].type === 'text' ? response.content[0].text : '';

  return {
    text_content: text,
    extracted_hierarchy: [],
    extracted_entities: [],
    document_type: 'Vision-extracted',
    summary: `PDF "${filename}" processed via vision. ${text.slice(0, 200)}...`,
  };
}
