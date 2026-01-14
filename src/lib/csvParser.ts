import * as XLSX from 'xlsx';

export interface ParsedRow {
  text1: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correct_option: string | number;
  explanation?: string;
  difficulty?: string;
  year?: string | number;
  source?: string;
  content_node_id?: string;
}

export interface ParseResult {
  rows: ParsedRow[];
  headers: string[];
  errors: string[];
}

const REQUIRED_COLUMNS = ['text1', 'option1', 'option2', 'option3', 'option4', 'correct_option'];

function normalizeHeader(header: string): string {
  return header.toLowerCase().trim().replace(/\s+/g, '_');
}

function parseCSVContent(content: string): ParseResult {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) {
    return { rows: [], headers: [], errors: ['File is empty'] };
  }

  // Parse header row
  const headerLine = lines[0];
  const headers = headerLine.split(',').map(h => normalizeHeader(h.replace(/^"|"$/g, '').trim()));
  
  // Check for required columns
  const missingColumns = REQUIRED_COLUMNS.filter(col => !headers.includes(col));
  if (missingColumns.length > 0) {
    return { 
      rows: [], 
      headers, 
      errors: [`Missing required columns: ${missingColumns.join(', ')}`] 
    };
  }

  const rows: ParsedRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parsing (handles basic quoted fields)
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    if (values.length !== headers.length) {
      errors.push(`Row ${i + 1}: Column count mismatch (expected ${headers.length}, got ${values.length})`);
      continue;
    }

    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx]?.replace(/^"|"$/g, '') || '';
    });

    rows.push(row as unknown as ParsedRow);
  }

  return { rows, headers, errors };
}

function parseExcelContent(buffer: ArrayBuffer): ParseResult {
  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { header: 1 });
    
    if (jsonData.length === 0) {
      return { rows: [], headers: [], errors: ['File is empty'] };
    }

    const firstRow = jsonData[0];
    if (!Array.isArray(firstRow)) {
      return { rows: [], headers: [], errors: ['Invalid file format'] };
    }
    
    const headerRow = firstRow as unknown[];
    const headers = headerRow.map(h => normalizeHeader(String(h || '')));
    
    const missingColumns = REQUIRED_COLUMNS.filter(col => !headers.includes(col));
    if (missingColumns.length > 0) {
      return { 
        rows: [], 
        headers, 
        errors: [`Missing required columns: ${missingColumns.join(', ')}`] 
      };
    }

    const rows: ParsedRow[] = [];
    const errors: string[] = [];

    for (let i = 1; i < jsonData.length; i++) {
      const item = jsonData[i];
      if (!Array.isArray(item)) continue;
      
      const rowData = item as unknown[];
      if (rowData.every(cell => cell === null || cell === undefined || cell === '')) {
        continue;
      }

      const row: Record<string, unknown> = {};
      headers.forEach((header, idx) => {
        row[header] = rowData[idx] ?? '';
      });

      rows.push(row as unknown as ParsedRow);
    }

    return { rows, headers, errors };
  } catch (error) {
    return { 
      rows: [], 
      headers: [], 
      errors: [`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`] 
    };
  }
}

export async function parseFile(file: File): Promise<ParseResult> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (extension === 'csv') {
    const content = await file.text();
    return parseCSVContent(content);
  } else if (extension === 'xlsx' || extension === 'xls') {
    const buffer = await file.arrayBuffer();
    return parseExcelContent(buffer);
  } else {
    return { 
      rows: [], 
      headers: [], 
      errors: [`Unsupported file format: .${extension}. Please use .csv or .xlsx`] 
    };
  }
}

export function generateSampleCSV(): string {
  const headers = [
    'text1',
    'option1',
    'option2',
    'option3',
    'option4',
    'correct_option',
    'explanation',
    'difficulty',
    'year',
    'source'
  ];
  
  const sampleRow = [
    'What is the capital of Pakistan?',
    'Lahore',
    'Karachi',
    'Islamabad',
    'Peshawar',
    '3',
    'Islamabad became the capital in 1960.',
    'easy',
    '2024',
    'General Knowledge'
  ];
  
  return [headers.join(','), sampleRow.join(',')].join('\n');
}
