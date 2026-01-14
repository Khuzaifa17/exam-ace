import type { ParsedRow } from './csvParser';

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ValidatedQuestion {
  text1: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correct_option: number;
  explanation: string | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  year: number | null;
  source: string | null;
  content_node_id: string;
}

export interface ValidationResult {
  valid: ValidatedQuestion[];
  errors: ValidationError[];
  invalidRows: Set<number>;
}

const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'];

export function validateQuestions(
  rows: ParsedRow[],
  globalContentNodeId?: string,
  existingNodeIds?: Set<string>
): ValidationResult {
  const valid: ValidatedQuestion[] = [];
  const errors: ValidationError[] = [];
  const invalidRows = new Set<number>();

  rows.forEach((row, index) => {
    const rowNum = index + 2; // +2 because of 0-indexing and header row
    let hasError = false;

    const addError = (field: string, message: string) => {
      errors.push({ row: rowNum, field, message });
      hasError = true;
      invalidRows.add(index);
    };

    // Required fields validation
    if (!row.text1?.toString().trim()) {
      addError('text1', 'Question text is required');
    }

    for (let i = 1; i <= 4; i++) {
      const optionKey = `option${i}` as keyof ParsedRow;
      if (!row[optionKey]?.toString().trim()) {
        addError(optionKey, `Option ${i} is required`);
      }
    }

    // Correct option validation
    const correctOption = parseInt(String(row.correct_option), 10);
    if (isNaN(correctOption) || correctOption < 1 || correctOption > 4) {
      addError('correct_option', 'Correct option must be 1, 2, 3, or 4');
    }

    // Difficulty validation (optional but must be valid if provided)
    const difficulty = row.difficulty?.toString().toLowerCase().trim();
    if (difficulty && !VALID_DIFFICULTIES.includes(difficulty)) {
      addError('difficulty', 'Difficulty must be easy, medium, or hard');
    }

    // Year validation (optional but must be valid if provided)
    let yearValue: number | null = null;
    if (row.year) {
      const parsed = parseInt(String(row.year), 10);
      if (isNaN(parsed) || parsed < 1900 || parsed > new Date().getFullYear() + 1) {
        addError('year', 'Year must be a valid year');
      } else {
        yearValue = parsed;
      }
    }

    // Content node ID validation
    const contentNodeId = row.content_node_id?.toString().trim() || globalContentNodeId;
    if (!contentNodeId) {
      addError('content_node_id', 'Content node ID is required (provide in CSV or select a topic)');
    } else if (existingNodeIds && !existingNodeIds.has(contentNodeId)) {
      addError('content_node_id', 'Content node ID does not exist in the database');
    }

    // If no errors, add to valid questions
    if (!hasError && contentNodeId) {
      valid.push({
        text1: row.text1.toString().trim(),
        option1: row.option1.toString().trim(),
        option2: row.option2.toString().trim(),
        option3: row.option3.toString().trim(),
        option4: row.option4.toString().trim(),
        correct_option: correctOption,
        explanation: row.explanation?.toString().trim() || null,
        difficulty: difficulty as 'easy' | 'medium' | 'hard' | null,
        year: yearValue,
        source: row.source?.toString().trim() || null,
        content_node_id: contentNodeId,
      });
    }
  });

  return { valid, errors, invalidRows };
}
