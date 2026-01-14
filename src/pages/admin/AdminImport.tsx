import { useState, useCallback } from 'react';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, X, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { parseFile, generateSampleCSV, type ParsedRow } from '@/lib/csvParser';
import { validateQuestions, type ValidationResult, type ValidatedQuestion } from '@/lib/questionValidator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type ContentNode = {
  id: string;
  title: string;
  node_type: 'TRACK' | 'SUBJECT' | 'CHAPTER' | 'TOPIC';
  parent_id: string | null;
  exam_id: string;
};

type Exam = {
  id: string;
  title: string;
};

const AdminImport = () => {
  const queryClient = useQueryClient();
  
  // State
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{ success: number; failed: number } | null>(null);

  // Fetch exams
  const { data: exams = [] } = useQuery({
    queryKey: ['exams-for-import'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exams')
        .select('id, title')
        .eq('is_active', true)
        .order('title');
      if (error) throw error;
      return data as Exam[];
    },
  });

  // Fetch content nodes for selected exam
  const { data: contentNodes = [] } = useQuery({
    queryKey: ['content-nodes-for-import', selectedExamId],
    queryFn: async () => {
      if (!selectedExamId) return [];
      const { data, error } = await supabase
        .from('content_nodes')
        .select('id, title, node_type, parent_id, exam_id')
        .eq('exam_id', selectedExamId)
        .order('order_index');
      if (error) throw error;
      return data as ContentNode[];
    },
    enabled: !!selectedExamId,
  });

  // Get only TOPIC nodes for the dropdown
  const topicNodes = contentNodes.filter(n => n.node_type === 'TOPIC');
  const nodeIdSet = new Set(contentNodes.map(n => n.id));

  // Build path for topic display
  const getNodePath = (nodeId: string): string => {
    const node = contentNodes.find(n => n.id === nodeId);
    if (!node) return '';
    
    const path: string[] = [node.title];
    let current = node;
    while (current.parent_id) {
      const parent = contentNodes.find(n => n.id === current.parent_id);
      if (parent) {
        path.unshift(parent.title);
        current = parent;
      } else break;
    }
    return path.join(' > ');
  };

  // File handling
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) processFile(droppedFile);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) processFile(selectedFile);
  };

  const processFile = async (f: File) => {
    // Reset state
    setFile(f);
    setParsedRows([]);
    setParseErrors([]);
    setValidationResult(null);
    setImportSummary(null);

    // Check file size (5MB max)
    if (f.size > 5 * 1024 * 1024) {
      setParseErrors(['File size exceeds 5MB limit']);
      return;
    }

    const result = await parseFile(f);
    
    if (result.errors.length > 0) {
      setParseErrors(result.errors);
    }
    
    if (result.rows.length > 0) {
      setParsedRows(result.rows);
      // Auto-validate
      const validation = validateQuestions(result.rows, selectedNodeId || undefined, nodeIdSet);
      setValidationResult(validation);
    }
  };

  // Re-validate when topic selection changes
  const handleNodeChange = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    if (parsedRows.length > 0) {
      const validation = validateQuestions(parsedRows, nodeId || undefined, nodeIdSet);
      setValidationResult(validation);
    }
  };

  // Download sample CSV
  const handleDownloadSample = () => {
    const csv = generateSampleCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'questions_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (questions: ValidatedQuestion[]) => {
      const BATCH_SIZE = 50;
      let successCount = 0;
      let failedCount = 0;

      for (let i = 0; i < questions.length; i += BATCH_SIZE) {
        const batch = questions.slice(i, i + BATCH_SIZE);
        
        const { error } = await supabase
          .from('questions')
          .insert(batch);

        if (error) {
          failedCount += batch.length;
          console.error('Batch insert error:', error);
        } else {
          successCount += batch.length;
        }

        setImportProgress(Math.round(((i + batch.length) / questions.length) * 100));
      }

      return { success: successCount, failed: failedCount };
    },
    onSuccess: (result) => {
      setImportSummary(result);
      setIsImporting(false);
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      if (result.success > 0) {
        toast.success(`Successfully imported ${result.success} questions`);
      }
      if (result.failed > 0) {
        toast.error(`Failed to import ${result.failed} questions`);
      }
    },
    onError: (error) => {
      setIsImporting(false);
      toast.error('Import failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    },
  });

  const handleImport = () => {
    if (!validationResult || validationResult.valid.length === 0) {
      toast.error('No valid questions to import');
      return;
    }

    setIsImporting(true);
    setImportProgress(0);
    importMutation.mutate(validationResult.valid);
  };

  const resetImport = () => {
    setFile(null);
    setParsedRows([]);
    setParseErrors([]);
    setValidationResult(null);
    setImportSummary(null);
    setImportProgress(0);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-bold mb-2">Import Questions</h1>
          <p className="text-muted-foreground">
            Bulk import questions from CSV or Excel files.
          </p>
        </div>

        {/* Step 1: Download Template */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Step 1: Download Template
            </CardTitle>
            <CardDescription>
              Download our CSV template to ensure your data is formatted correctly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handleDownloadSample}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Download CSV Template
            </Button>
          </CardContent>
        </Card>

        {/* Step 2: Select Target Topic */}
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Select Target Topic (Optional)</CardTitle>
            <CardDescription>
              Select an exam and topic to apply to all questions. Or include content_node_id in your CSV.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Exam</Label>
                <Select value={selectedExamId} onValueChange={(v) => { setSelectedExamId(v); setSelectedNodeId(''); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an exam" />
                  </SelectTrigger>
                  <SelectContent>
                    {exams.map(exam => (
                      <SelectItem key={exam.id} value={exam.id}>{exam.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Topic</Label>
                <Select 
                  value={selectedNodeId} 
                  onValueChange={handleNodeChange}
                  disabled={!selectedExamId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedExamId ? "Select a topic" : "Select exam first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {topicNodes.map(node => (
                      <SelectItem key={node.id} value={node.id}>
                        {getNodePath(node.id)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Upload File */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Step 3: Upload File
            </CardTitle>
            <CardDescription>
              Drag and drop your CSV or Excel file, or click to browse.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
                file && "border-green-500 bg-green-50 dark:bg-green-950/20"
              )}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <input
                id="file-input"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileSpreadsheet className="h-8 w-8 text-green-600" />
                  <div className="text-left">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB • {parsedRows.length} rows parsed
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); resetImport(); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">
                    Drop your file here or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports CSV, XLSX (max 5MB)
                  </p>
                </>
              )}
            </div>

            {/* Parse Errors */}
            {parseErrors.length > 0 && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Parse Errors</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2">
                    {parseErrors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Step 4: Preview & Validation */}
        {parsedRows.length > 0 && validationResult && (
          <Card>
            <CardHeader>
              <CardTitle>Step 4: Preview & Validation</CardTitle>
              <CardDescription>
                Review parsed questions. Rows with errors are highlighted in red.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Summary badges */}
              <div className="flex gap-3 flex-wrap">
                <Badge variant="secondary" className="text-sm">
                  Total: {parsedRows.length}
                </Badge>
                <Badge className="bg-green-600 text-sm">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Valid: {validationResult.valid.length}
                </Badge>
                {validationResult.errors.length > 0 && (
                  <Badge variant="destructive" className="text-sm">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Errors: {validationResult.invalidRows.size} rows
                  </Badge>
                )}
              </div>

              {/* Validation errors list */}
              {validationResult.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Validation Errors</AlertTitle>
                  <AlertDescription>
                    <ScrollArea className="h-32 mt-2">
                      <ul className="text-sm space-y-1">
                        {validationResult.errors.slice(0, 50).map((err, i) => (
                          <li key={i}>
                            Row {err.row}: <strong>{err.field}</strong> - {err.message}
                          </li>
                        ))}
                        {validationResult.errors.length > 50 && (
                          <li className="text-muted-foreground">
                            ...and {validationResult.errors.length - 50} more errors
                          </li>
                        )}
                      </ul>
                    </ScrollArea>
                  </AlertDescription>
                </Alert>
              )}

              {/* Preview table */}
              <ScrollArea className="h-80 border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Question</TableHead>
                      <TableHead className="w-20">Answer</TableHead>
                      <TableHead className="w-24">Difficulty</TableHead>
                      <TableHead className="w-20">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.slice(0, 100).map((row, idx) => {
                      const isInvalid = validationResult.invalidRows.has(idx);
                      return (
                        <TableRow 
                          key={idx}
                          className={cn(isInvalid && "bg-destructive/10")}
                        >
                          <TableCell className="font-mono text-xs">{idx + 2}</TableCell>
                          <TableCell className="max-w-md truncate" title={row.text1?.toString()}>
                            {row.text1?.toString().slice(0, 80)}
                            {(row.text1?.toString().length || 0) > 80 && '...'}
                          </TableCell>
                          <TableCell>{row.correct_option}</TableCell>
                          <TableCell>
                            {row.difficulty && (
                              <Badge variant="outline" className="capitalize">
                                {row.difficulty}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {isInvalid ? (
                              <AlertCircle className="h-4 w-4 text-destructive" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {parsedRows.length > 100 && (
                  <p className="text-center text-sm text-muted-foreground py-2">
                    Showing first 100 of {parsedRows.length} rows
                  </p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Import */}
        {validationResult && validationResult.valid.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 5: Import Questions</CardTitle>
              <CardDescription>
                Click import to add {validationResult.valid.length} valid questions to the database.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isImporting && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Importing questions...</span>
                  </div>
                  <Progress value={importProgress} />
                  <p className="text-sm text-muted-foreground">{importProgress}% complete</p>
                </div>
              )}

              {importSummary && (
                <Alert className={importSummary.failed > 0 ? "border-yellow-500" : "border-green-500"}>
                  {importSummary.failed > 0 ? (
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  )}
                  <AlertTitle>Import Complete</AlertTitle>
                  <AlertDescription>
                    Successfully imported {importSummary.success} questions.
                    {importSummary.failed > 0 && ` Failed: ${importSummary.failed}.`}
                  </AlertDescription>
                </Alert>
              )}

              {!isImporting && !importSummary && (
                <div className="flex gap-3">
                  <Button onClick={handleImport} disabled={validationResult.valid.length === 0}>
                    <Upload className="h-4 w-4 mr-2" />
                    Import {validationResult.valid.length} Questions
                  </Button>
                  <Button variant="outline" onClick={resetImport}>
                    Cancel
                  </Button>
                </div>
              )}

              {importSummary && (
                <Button variant="outline" onClick={resetImport}>
                  Import More Questions
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminImport;
