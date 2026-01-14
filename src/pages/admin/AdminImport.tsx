import { Upload } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const AdminImport = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold mb-2">Import Questions</h1>
          <p className="text-muted-foreground">
            Bulk import is coming soon. For now, add questions from the Questions page.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              CSV Import
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            We’ll add a guided CSV uploader here (validation, preview, and error reporting).
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminImport;
