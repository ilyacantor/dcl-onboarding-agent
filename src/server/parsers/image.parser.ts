import Anthropic from '@anthropic-ai/sdk';

export interface ImageParseResult {
  description: string;
  extracted_hierarchy: { name: string; level: number; children: string[] }[];
  extracted_values: { label: string; value: string }[];
  extracted_systems: string[];
  raw_text: string;
  summary: string;
}

type ImageMediaType = 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';

const MEDIA_TYPE_MAP: Record<string, ImageMediaType> = {
  'image/png': 'image/png',
  'image/jpeg': 'image/jpeg',
  'image/jpg': 'image/jpeg',
  'image/gif': 'image/gif',
  'image/webp': 'image/webp',
};

export async function parseImage(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<ImageParseResult> {
  const anthropic = new Anthropic();
  const base64 = buffer.toString('base64');
  const mediaType = MEDIA_TYPE_MAP[mimeType] || 'image/png';

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          {
            type: 'text',
            text: `Analyze this image "${filename}" for enterprise onboarding. Extract ALL of the following that you can find:

1. **Organizational hierarchy**: Division names, department names, entity names, reporting lines. List them with indentation showing parent-child relationships.
2. **Financial structure**: Cost centers, profit centers, GL accounts, segments.
3. **System names**: Any ERP, CRM, or enterprise system names visible (e.g., SAP, Oracle, Workday, NetSuite).
4. **Field names and values**: Any labeled data fields with their values.
5. **Raw text**: All readable text in the image.

Format your response as structured sections:
DESCRIPTION: (one sentence describing what the image shows)
HIERARCHY:
- Parent Name
  - Child Name
  - Child Name
SYSTEMS: system1, system2
VALUES:
- Label: Value
RAW_TEXT: (all text)`,
          },
        ],
      },
    ],
  });

  const text =
    response.content[0].type === 'text' ? response.content[0].text : '';

  // Parse the structured response
  const description = extractSection(text, 'DESCRIPTION') || 'Image analysis complete';
  const hierarchyText = extractSection(text, 'HIERARCHY');
  const systemsText = extractSection(text, 'SYSTEMS');
  const valuesText = extractSection(text, 'VALUES');
  const rawText = extractSection(text, 'RAW_TEXT') || text;

  // Parse hierarchy
  const hierarchy = parseHierarchySection(hierarchyText);

  // Parse systems
  const systems = systemsText
    ? systemsText.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  // Parse values
  const values = parseValuesSection(valuesText);

  const summary = `Image "${filename}": ${description} Found ${hierarchy.length} hierarchy items, ${systems.length} systems, ${values.length} data values.`;

  return {
    description,
    extracted_hierarchy: hierarchy,
    extracted_values: values,
    extracted_systems: systems,
    raw_text: rawText,
    summary,
  };
}

function extractSection(text: string, section: string): string {
  const pattern = new RegExp(
    `${section}:\\s*(.+?)(?=\\n[A-Z_]+:|$)`,
    's',
  );
  const match = pattern.exec(text);
  return match ? match[1].trim() : '';
}

function parseHierarchySection(
  text: string,
): { name: string; level: number; children: string[] }[] {
  if (!text) return [];

  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  const items: { name: string; level: number; children: string[] }[] = [];

  for (const line of lines) {
    const stripped = line.replace(/^[\s-*]+/, '');
    if (!stripped) continue;
    const indent = line.search(/\S/);
    const level = Math.floor(indent / 2);
    items.push({ name: stripped.trim(), level, children: [] });
  }

  // Link children
  for (let i = 1; i < items.length; i++) {
    for (let j = i - 1; j >= 0; j--) {
      if (items[j].level < items[i].level) {
        items[j].children.push(items[i].name);
        break;
      }
    }
  }

  return items;
}

function parseValuesSection(text: string): { label: string; value: string }[] {
  if (!text) return [];

  const values: { label: string; value: string }[] = [];
  const lines = text.split('\n').filter((l) => l.trim().length > 0);

  for (const line of lines) {
    const match = line.match(/^[\s-*]*(.+?):\s*(.+)$/);
    if (match) {
      values.push({ label: match[1].trim(), value: match[2].trim() });
    }
  }

  return values;
}
