// Sprint 2 — File processing router (stub)
// Will dispatch to excel.parser, pdf.parser, image.parser based on MIME type

export interface FileProcessingResult {
  filename: string;
  mime_type: string;
  extracted_data: Record<string, unknown>;
  summary: string;
}

export async function processFile(
  _filename: string,
  _buffer: Buffer,
  _mimeType: string,
): Promise<FileProcessingResult> {
  throw new Error('File processing not implemented yet (Sprint 2)');
}
