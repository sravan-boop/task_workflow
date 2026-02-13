import { ReportingContent } from "@/components/reporting/reporting-content";

export default function ReportingPage() {
  return (
    <div className="h-full">
      <div className="flex h-14 items-center border-b bg-white px-6">
        <h1 className="text-lg font-medium text-[#1e1f21]">Reporting</h1>
      </div>
      <ReportingContent />
    </div>
  );
}
