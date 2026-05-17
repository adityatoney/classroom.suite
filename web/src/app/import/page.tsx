import { Upload } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { XlsxUploader } from "@/components/import/xlsx-uploader";

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Upload />}
        tone="rose"
        title="Bulk import"
        description="One .xlsx replaces rosters, students, subjects, and comment banks in a single transaction. Use this when you maintain your data in a spreadsheet and want the app to mirror it."
      />
      <XlsxUploader />
    </div>
  );
}
