// Client-side CSV export utility

interface ExportTask {
  title: string;
  assignee?: { name: string; email: string } | null;
  status: string;
  dueDate?: Date | string | null;
  taskProjects?: Array<{ section?: { name: string } | null }>;
  tags?: Array<{ tag: { name: string } }>;
}

export function exportTasksToCsv(tasks: ExportTask[], projectName: string) {
  const headers = [
    "Task",
    "Assignee",
    "Assignee Email",
    "Status",
    "Due Date",
    "Section",
    "Tags",
  ];

  const rows = tasks.map((task) => [
    escapeCsvField(task.title),
    escapeCsvField(task.assignee?.name ?? ""),
    escapeCsvField(task.assignee?.email ?? ""),
    task.status === "COMPLETE" ? "Complete" : "Incomplete",
    task.dueDate
      ? new Date(task.dueDate).toLocaleDateString()
      : "",
    escapeCsvField(task.taskProjects?.[0]?.section?.name ?? ""),
    escapeCsvField(
      task.tags?.map((t) => t.tag.name).join(", ") ?? ""
    ),
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  downloadFile(csv, `${projectName}-tasks.csv`, "text/csv;charset=utf-8;");
}

function escapeCsvField(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

export function downloadFile(
  content: string,
  filename: string,
  mimeType: string
) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportWorkspaceToZip(data: {
  workspaceName: string;
  members: Array<Record<string, unknown>>;
  projects: Array<Record<string, unknown>>;
  tasks: Array<Record<string, unknown>>;
  comments: Array<Record<string, unknown>>;
}) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();

  const toCsv = (rows: Array<Record<string, unknown>>): string => {
    if (rows.length === 0) return "";
    const headers = Object.keys(rows[0]!);
    const lines = rows.map((row) =>
      headers.map((h) => escapeCsvField(String(row[h] ?? ""))).join(",")
    );
    return [headers.join(","), ...lines].join("\n");
  };

  zip.file("members.csv", toCsv(data.members));
  zip.file("projects.csv", toCsv(data.projects));
  zip.file("tasks.csv", toCsv(data.tasks));
  zip.file("comments.csv", toCsv(data.comments));

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${data.workspaceName}-export.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportReportToCsv(
  data: Array<Record<string, unknown>>,
  filename: string
) {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]!);
  const rows = data.map((row) =>
    headers.map((h) => escapeCsvField(String(row[h] ?? "")))
  );

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  downloadFile(csv, filename, "text/csv;charset=utf-8;");
}
