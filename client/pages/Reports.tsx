// client/pages/Reports.tsx
import { useState, useEffect } from "react";
import { Download, FileText, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { reportsApi, eventApi } from "@/services/api";
import { toast } from "@/components/ui/use-toast";

interface ReportRecord {
  id: string;
  name: string;
  type: string;
  eventCode: string;
  period: string;
  format: string;
  createdAt: string;
  size: string;
  rows: any[];
}

interface Event {
  id: number;
  event_code: string;
  event_name: string;
}

export default function Reports() {
  const [reportType, setReportType] = useState("attendance-summary");
  const [selectedEvent, setSelectedEvent] = useState<string>("all");
  const [period, setPeriod] = useState("month");
  const [format, setFormat] = useState("csv");
  const [events, setEvents] = useState<Event[]>([]);
  const [generatedReports, setGeneratedReports] = useState<ReportRecord[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    eventApi
      .getAll({ isActive: true })
      .then((res) => setEvents(res.data.data))
      .catch(() => {});
  }, []);

  // ─── CSV export ────────────────────────────────────────────────────────────
  const exportCSV = (rows: any[], filename: string) => {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers
          .map((h) => {
            const val = r[h] ?? "";
            const str = String(val).replace(/"/g, '""');
            return str.includes(",") ? `"${str}"` : str;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── PDF export via print ──────────────────────────────────────────────────
  const exportPDF = (report: ReportRecord) => {
    const { rows } = report;
    if (!rows.length) {
      toast({ title: "No data", description: "Nothing to export.", variant: "destructive" });
      return;
    }

    const headers = Object.keys(rows[0]);
    const tableRows = rows
      .map(
        (r) =>
          `<tr>${headers
            .map((h) => `<td style="padding:6px 10px;border:1px solid #ddd;">${r[h] ?? "-"}</td>`)
            .join("")}</tr>`
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${report.name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
          h1 { font-size: 18px; margin-bottom: 4px; }
          p  { font-size: 12px; color: #666; margin-bottom: 16px; }
          table { border-collapse: collapse; width: 100%; font-size: 12px; }
          th { background: #1d4ed8; color: white; padding: 8px 10px; border: 1px solid #1d4ed8; text-align: left; }
          tr:nth-child(even) { background: #f0f4ff; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <h1>${report.name}</h1>
        <p>Generated: ${new Date(report.createdAt).toLocaleString("id-ID")} | Period: ${report.period} | Records: ${rows.length}</p>
        <table>
          <thead><tr>${headers.map((h) => `<th>${h.replace(/_/g, " ").toUpperCase()}</th>`).join("")}</tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
      </html>
    `;

    const win = window.open("", "_blank");
    if (!win) {
      toast({ title: "Popup blocked", description: "Please allow popups for PDF export.", variant: "destructive" });
      return;
    }
    win.document.write(html);
    win.document.close();
    win.onload = () => {
      win.print();
    };
  };

  // ─── Generate report ───────────────────────────────────────────────────────
  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      const eventInfo = events.find((e) => e.id.toString() === selectedEvent);
      const eventLabel = eventInfo ? eventInfo.event_code : "All Events";

      const res = await reportsApi.generate({
        reportType,
        eventId: selectedEvent !== "all" ? parseInt(selectedEvent) : undefined,
        period,
        format,
      });

      const { data } = res.data;
      const rowCount = data.rows?.length ?? 0;
      const approxSize = `${((JSON.stringify(data.rows).length) / 1024).toFixed(1)} KB`;

      const newReport: ReportRecord = {
        id: data.id,
        name: `${reportType.replace(/-/g, " ")} — ${eventLabel} — ${period}`,
        type: reportType,
        eventCode: eventLabel,
        period,
        format: format.toUpperCase(),
        createdAt: data.generatedAt,
        size: approxSize,
        rows: data.rows,
      };

      setGeneratedReports((prev) => [newReport, ...prev]);

      toast({
        title: "Report generated",
        description: `${rowCount} records found. Click Download to export.`,
      });

      // Auto-download
      if (format === "csv") {
        exportCSV(data.rows, `${newReport.name.replace(/\s/g, "_")}.csv`);
      } else if (format === "pdf") {
        exportPDF(newReport);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = (report: ReportRecord) => {
    if (!report.rows?.length) {
      toast({ title: "No data", description: "This report has no data rows.", variant: "destructive" });
      return;
    }
    if (report.format === "PDF") {
      exportPDF(report);
    } else {
      exportCSV(report.rows, `${report.name.replace(/\s/g, "_")}.csv`);
    }
  };

  const handleDelete = (id: string) =>
    setGeneratedReports((prev) => prev.filter((r) => r.id !== id));

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold">Reports</h1>
        <p className="text-muted-foreground mt-1">
          Generate and download attendance reports
        </p>
      </div>

      {/* Generator */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6">Generate New Report</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <Label className="mb-2 block text-sm font-medium">Report Type</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="attendance-summary">Attendance Summary</SelectItem>
                <SelectItem value="lateness-report">Lateness Report</SelectItem>
                <SelectItem value="student-performance">Member Performance</SelectItem>
                <SelectItem value="absence-analysis">Absence Analysis</SelectItem>
                <SelectItem value="class-statistics">Event Statistics</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2 block text-sm font-medium">Event</Label>
            <Select value={selectedEvent} onValueChange={setSelectedEvent}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                {events.map((evt) => (
                  <SelectItem key={evt.id} value={evt.id.toString()}>
                    {evt.event_code} — {evt.event_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2 block text-sm font-medium">Period</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="semester">Semester (6 months)</SelectItem>
                <SelectItem value="year">Full Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2 block text-sm font-medium">Format</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="pdf">PDF (print)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          className="w-full bg-primary hover:bg-primary/90"
          onClick={handleGenerateReport}
          disabled={generating}
        >
          {generating ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </span>
          ) : (
            "Generate Report"
          )}
        </Button>
      </Card>

      {/* Generated Reports */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Generated Reports</h2>
        {generatedReports.length > 0 ? (
          <div className="space-y-3">
            {generatedReports.map((report) => (
              <Card
                key={report.id}
                className="p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 bg-muted rounded-lg">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold capitalize">{report.name}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {report.type.replace(/-/g, " ")}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {report.format}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {report.rows.length} rows
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {report.size}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(report.createdAt).toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 w-full md:w-auto">
                    <Button
                      variant="outline"
                      className="gap-2 flex-1 md:flex-none"
                      onClick={() => handleDownload(report)}
                      disabled={!report.rows.length}
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(report.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
            <p className="text-muted-foreground">No reports generated yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Configure options above and click Generate Report
            </p>
          </Card>
        )}
      </div>

      {/* Templates info */}
      <Card className="p-6 bg-muted/50">
        <h3 className="font-semibold mb-3">Report Templates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          {[
            ["Attendance Summary", "Complete attendance log for selected period and event"],
            ["Lateness Report", "All records where members arrived late"],
            ["Member Performance", "Per-member attendance percentage and totals"],
            ["Absence Analysis", "Absent, excused, and sick breakdown per member"],
            ["Event Statistics", "Same as Attendance Summary with all columns"],
          ].map(([title, desc]) => (
            <div key={title}>
              <p className="font-medium mb-1">{title}</p>
              <p className="text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
