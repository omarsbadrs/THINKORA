import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FileEvalCase {
  id: string;
  name: string;
  query: string;
  expectedSource: 'files';
  expectedBehavior: string;
  fileTypes: string[];
  expectedFields: string[];
  complexityLevel: 'low' | 'medium' | 'high';
}

// ---------------------------------------------------------------------------
// Eval Cases
// ---------------------------------------------------------------------------

const fileOnlyCases: FileEvalCase[] = [
  {
    id: 'file-pdf-001',
    name: 'PDF document analysis',
    query: 'Summarize the key findings from the uploaded research paper',
    expectedSource: 'files',
    expectedBehavior: 'pdf_analysis',
    fileTypes: ['application/pdf'],
    expectedFields: ['summary', 'keyFindings', 'citations', 'pageCount'],
    complexityLevel: 'medium',
  },
  {
    id: 'file-spreadsheet-002',
    name: 'Spreadsheet data query',
    query: 'What is the average revenue per region in the sales spreadsheet?',
    expectedSource: 'files',
    expectedBehavior: 'spreadsheet_query',
    fileTypes: ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    expectedFields: ['result', 'formula', 'dataRange', 'columnNames'],
    complexityLevel: 'medium',
  },
  {
    id: 'file-code-003',
    name: 'Code file review',
    query: 'Review the uploaded TypeScript file for potential issues and improvements',
    expectedSource: 'files',
    expectedBehavior: 'code_review',
    fileTypes: ['text/typescript', 'application/javascript'],
    expectedFields: ['issues', 'suggestions', 'complexity', 'linesOfCode'],
    complexityLevel: 'high',
  },
  {
    id: 'file-multi-004',
    name: 'Multi-file comparison',
    query: 'Compare the two uploaded configuration files and highlight differences',
    expectedSource: 'files',
    expectedBehavior: 'multi_file_comparison',
    fileTypes: ['application/json', 'application/yaml'],
    expectedFields: ['differences', 'commonKeys', 'onlyInA', 'onlyInB'],
    complexityLevel: 'high',
  },
  {
    id: 'file-ocr-005',
    name: 'Image OCR and text extraction',
    query: 'Extract all text visible in the uploaded screenshot',
    expectedSource: 'files',
    expectedBehavior: 'image_ocr',
    fileTypes: ['image/png', 'image/jpeg'],
    expectedFields: ['extractedText', 'confidence', 'regions', 'language'],
    complexityLevel: 'medium',
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('File-Only Eval Cases', () => {
  describe('case definitions', () => {
    it('should have exactly 5 test cases', () => {
      expect(fileOnlyCases).toHaveLength(5);
    });

    it('should have unique case IDs', () => {
      const ids = fileOnlyCases.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should all target the files source', () => {
      for (const c of fileOnlyCases) {
        expect(c.expectedSource).toBe('files');
      }
    });

    it('should all have at least one expected file type', () => {
      for (const c of fileOnlyCases) {
        expect(c.fileTypes.length).toBeGreaterThan(0);
      }
    });
  });

  describe('PDF analysis case', () => {
    const pdfCase = fileOnlyCases.find((c) => c.expectedBehavior === 'pdf_analysis')!;

    it('should exist and target PDF files', () => {
      expect(pdfCase).toBeDefined();
      expect(pdfCase.fileTypes).toContain('application/pdf');
    });

    it('should expect summary and key findings', () => {
      expect(pdfCase.expectedFields).toContain('summary');
      expect(pdfCase.expectedFields).toContain('keyFindings');
    });
  });

  describe('spreadsheet query case', () => {
    const sheetCase = fileOnlyCases.find((c) => c.expectedBehavior === 'spreadsheet_query')!;

    it('should support CSV and XLSX file types', () => {
      expect(sheetCase.fileTypes).toContain('text/csv');
      expect(sheetCase.fileTypes.some((t) => t.includes('spreadsheet'))).toBe(true);
    });

    it('should expect result and formula fields', () => {
      expect(sheetCase.expectedFields).toContain('result');
      expect(sheetCase.expectedFields).toContain('formula');
    });
  });

  describe('code review case', () => {
    const codeCase = fileOnlyCases.find((c) => c.expectedBehavior === 'code_review')!;

    it('should be marked as high complexity', () => {
      expect(codeCase.complexityLevel).toBe('high');
    });

    it('should expect issues and suggestions', () => {
      expect(codeCase.expectedFields).toContain('issues');
      expect(codeCase.expectedFields).toContain('suggestions');
    });
  });

  describe('multi-file comparison case', () => {
    const multiCase = fileOnlyCases.find((c) => c.expectedBehavior === 'multi_file_comparison')!;

    it('should be marked as high complexity', () => {
      expect(multiCase.complexityLevel).toBe('high');
    });

    it('should expect difference analysis fields', () => {
      expect(multiCase.expectedFields).toContain('differences');
      expect(multiCase.expectedFields).toContain('onlyInA');
      expect(multiCase.expectedFields).toContain('onlyInB');
    });
  });

  describe('image OCR case', () => {
    const ocrCase = fileOnlyCases.find((c) => c.expectedBehavior === 'image_ocr')!;

    it('should support PNG and JPEG', () => {
      expect(ocrCase.fileTypes).toContain('image/png');
      expect(ocrCase.fileTypes).toContain('image/jpeg');
    });

    it('should expect extracted text and confidence', () => {
      expect(ocrCase.expectedFields).toContain('extractedText');
      expect(ocrCase.expectedFields).toContain('confidence');
    });
  });
});

export { fileOnlyCases };
export type { FileEvalCase };
