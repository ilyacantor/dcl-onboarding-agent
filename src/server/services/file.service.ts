import { v4 as uuid } from 'uuid';
import { parseExcel } from '../parsers/excel.parser.js';
import { parsePdf } from '../parsers/pdf.parser.js';
import { parseImage } from '../parsers/image.parser.js';

export interface FileProcessingResult {
  filename: string;
  mime_type: string;
  extracted_data: Record<string, unknown>;
  summary: string;
}

const EXCEL_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
]);

const PDF_TYPES = new Set(['application/pdf']);

const IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
]);

function inferMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'csv':
      return 'text/csv';
    case 'pdf':
      return 'application/pdf';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'txt':
      return 'text/plain';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    default:
      return 'application/octet-stream';
  }
}

export async function processFile(
  filename: string,
  buffer: Buffer,
  mimeType?: string,
): Promise<FileProcessingResult> {
  const mime = mimeType || inferMimeType(filename);

  try {
    if (EXCEL_TYPES.has(mime)) {
      const result = parseExcel(buffer, filename);
      return {
        filename,
        mime_type: mime,
        extracted_data: {
          type: 'spreadsheet',
          headers: result.headers,
          rows: result.rows.slice(0, 100), // Cap at 100 rows for LLM context
          row_count: result.row_count,
          detected_dimensions: result.detected_dimensions,
          detected_hierarchies: result.detected_hierarchies,
        },
        summary: result.summary,
      };
    }

    if (PDF_TYPES.has(mime)) {
      const result = await parsePdf(buffer, filename);
      return {
        filename,
        mime_type: mime,
        extracted_data: {
          type: 'pdf',
          text_content: result.text_content.slice(0, 10000), // Cap for LLM context
          extracted_hierarchy: result.extracted_hierarchy,
          extracted_entities: result.extracted_entities,
          document_type: result.document_type,
        },
        summary: result.summary,
      };
    }

    if (IMAGE_TYPES.has(mime)) {
      const result = await parseImage(buffer, filename, mime);
      return {
        filename,
        mime_type: mime,
        extracted_data: {
          type: 'image',
          description: result.description,
          extracted_hierarchy: result.extracted_hierarchy,
          extracted_values: result.extracted_values,
          extracted_systems: result.extracted_systems,
          raw_text: result.raw_text,
        },
        summary: result.summary,
      };
    }

    // Plain text and other text-based files
    if (mime.startsWith('text/')) {
      const text = buffer.toString('utf-8');
      return {
        filename,
        mime_type: mime,
        extracted_data: {
          type: 'text',
          content: text.slice(0, 10000),
        },
        summary: `Text file "${filename}" — ${text.length} characters.`,
      };
    }

    // Unsupported type — return basic info
    return {
      filename,
      mime_type: mime,
      extracted_data: {
        type: 'unsupported',
        error: `Unsupported file type: ${mime}`,
      },
      summary: `File "${filename}" has unsupported type ${mime}. Could not extract data.`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      filename,
      mime_type: mime,
      extracted_data: {
        type: 'error',
        error: message,
      },
      summary: `Error processing "${filename}": ${message}`,
    };
  }
}
