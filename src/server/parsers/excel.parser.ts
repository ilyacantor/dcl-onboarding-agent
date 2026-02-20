import * as XLSX from 'xlsx';

export interface ExcelParseResult {
  headers: string[];
  rows: unknown[][];
  detected_dimensions: string[];
  detected_hierarchies: { parent: string; children: string[] }[];
  row_count: number;
  summary: string;
}

const DIMENSION_KEYWORDS = [
  'cost center', 'cost_center', 'costcenter', 'cc',
  'department', 'dept',
  'division', 'div',
  'region', 'geography', 'country', 'location',
  'legal entity', 'legal_entity', 'company', 'entity',
  'business unit', 'bu', 'segment',
  'profit center', 'profit_center', 'profitcenter', 'pc',
];

export function parseExcel(buffer: Buffer, filename: string): ExcelParseResult {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rawData: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  if (rawData.length === 0) {
    return {
      headers: [],
      rows: [],
      detected_dimensions: [],
      detected_hierarchies: [],
      row_count: 0,
      summary: `Empty spreadsheet: ${filename}`,
    };
  }

  // Auto-detect header row: first row where majority of cells are non-empty strings
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(rawData.length, 10); i++) {
    const row = rawData[i];
    if (!Array.isArray(row)) continue;
    const textCells = row.filter(
      (c) => typeof c === 'string' && c.trim().length > 0,
    );
    if (textCells.length >= row.length * 0.5 && row.length >= 2) {
      headerRowIdx = i;
      break;
    }
  }

  const headers = (rawData[headerRowIdx] as unknown[]).map((h) =>
    String(h ?? '').trim(),
  );
  const dataRows = rawData.slice(headerRowIdx + 1).filter((row) => {
    if (!Array.isArray(row)) return false;
    return row.some((c) => c !== null && c !== undefined && String(c).trim() !== '');
  });

  // Detect dimension columns
  const detectedDimensions: string[] = [];
  for (const header of headers) {
    const lower = header.toLowerCase();
    for (const keyword of DIMENSION_KEYWORDS) {
      if (lower.includes(keyword)) {
        detectedDimensions.push(header);
        break;
      }
    }
  }

  // Detect hierarchy patterns in code columns (4000 → 4100 → 4110)
  const detectedHierarchies: { parent: string; children: string[] }[] = [];
  for (let colIdx = 0; colIdx < headers.length; colIdx++) {
    const values = dataRows
      .map((r) => String((r as unknown[])[colIdx] ?? '').trim())
      .filter((v) => /^\d{3,}$/.test(v));

    if (values.length < 3) continue;

    // Group by prefix to find hierarchy
    const groups = new Map<string, string[]>();
    for (const val of values) {
      if (val.length >= 4) {
        const prefix = val.slice(0, -2);
        if (!groups.has(prefix)) groups.set(prefix, []);
        groups.get(prefix)!.push(val);
      }
    }

    for (const [parent, children] of groups) {
      if (children.length >= 2 && values.includes(parent + '00')) {
        detectedHierarchies.push({ parent: parent + '00', children });
      }
    }
  }

  // Build summary
  const sheetCount = workbook.SheetNames.length;
  const dimText =
    detectedDimensions.length > 0
      ? `Detected dimensions: ${detectedDimensions.join(', ')}.`
      : 'No standard dimension columns detected.';

  const summary = `Parsed "${filename}" — ${sheetCount} sheet(s), ${dataRows.length} data rows, ${headers.length} columns. ${dimText}`;

  return {
    headers,
    rows: dataRows,
    detected_dimensions: detectedDimensions,
    detected_hierarchies: detectedHierarchies,
    row_count: dataRows.length,
    summary,
  };
}
