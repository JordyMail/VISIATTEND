// client/pages/Reports.tsx
import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { reportsApi } from "@/services/api";
import { toast } from "@/components/ui/use-toast";
import { format as formatDate } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useLanguage } from "@/lib/i18n";

type PeriodOption =
  | "this_week" | "last_week" | "this_month" | "last_month"
  | "this_year" | "all_time" | "custom";

interface ReportRow {
  member_id: string;
  name: string;
  check_in: string;
  status: string;
}

interface ReportGroup {
  eventCode: string | null;
  eventName: string;
  dateEvent: string | null;
  rows: ReportRow[];
}

interface ReportRecord {
  id: string;
  period: string;
  startDate: string | null;
  endDate: string | null;
  format: string;
  createdAt: string;
  groups: ReportGroup[];
  count: number;
}

const PERIOD_LABELS: Record<PeriodOption, string> = {
  this_week: "This Week",
  last_week: "Last Week",
  this_month: "This Month",
  last_month: "Last Month",
  this_year: "This Year",
  all_time: "All Time",
  custom: "Custom Range",
};

export default function Reports() {
  const { t } = useLanguage();
  const [period, setPeriod] = useState<PeriodOption>("this_month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [format, setFormat] = useState("csv");
  const [generatedReports, setGeneratedReports] = useState<ReportRecord[]>([]);
  const [generating, setGenerating] = useState(false);

  // ─── Flatten grouped rows for CSV export ───────────────────────────────────
  const flattenRows = (groups: ReportGroup[]) =>
    groups.flatMap((g) =>
      g.rows.map((r) => ({
        event_name: g.eventName,
        event_date: g.dateEvent
          ? formatDate(new Date(g.dateEvent), "yyyy-MM-dd")
          : "-",
        member_id: r.member_id,
        name: r.name,
        status: r.status,
        check_in: r.check_in,
      }))
    );

  // ─── CSV export ────────────────────────────────────────────────────────────
  const exportCSV = (groups: ReportGroup[], filename: string) => {
    const rows = flattenRows(groups);
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((r: any) =>
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

  // ─── PDF export via print (event as subheading) ────────────────────────────
  const exportPDF = (report: ReportRecord) => {
    if (!report.groups.length) {
      toast({ title: t("noData"), description: t("noDataToExport"), variant: "destructive" });
      return;
    }

    const sections = report.groups
      .map((g) => {
        const dateLabel = g.dateEvent
          ? formatDate(new Date(g.dateEvent), "d MMMM yyyy", { locale: idLocale })
          : "";
        const tableRows = g.rows
          .map(
            (r) =>
              `<tr><td>${r.member_id}</td><td>${r.name}</td><td>${r.status}</td><td>${r.check_in}</td></tr>`
          )
          .join("");
        return `
          <h2>${g.eventName}</h2>
          <p class="event-date">${dateLabel}</p>
          <table>
            <thead><tr><th>${t("reportMemberId")}</th><th>${t("reportName")}</th><th>${t("reportAttendance")}</th><th>${t("reportCheckIn")}</th></tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
        `;
      })
      .join("<br/>");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${t("attendanceReport")}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          h2 { font-size: 15px; margin: 18px 0 2px; color: #1d4ed8; }
          .event-date { font-size: 12px; color: #666; margin-bottom: 8px; font-style: italic; }
          p.meta { font-size: 12px; color: #666; margin-bottom: 16px; }
          table { border-collapse: collapse; width: 100%; font-size: 12px; margin-bottom: 8px; }
          th { background: #1d4ed8; color: white; padding: 6px 10px; border: 1px solid #1d4ed8; text-align: left; }
          td { padding: 6px 10px; border: 1px solid #ddd; }
          tr:nth-child(even) { background: #f0f4ff; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <h1>${t("attendanceReport")}</h1>
        <p class="meta">${t("generated")}: ${new Date(report.createdAt).toLocaleString("id-ID")} | ${t("period")}: ${PERIOD_LABELS[report.period as PeriodOption] || report.period} | ${t("records")}: ${report.count}</p>
        ${sections}
      </body>
      </html>
    `;

    const win = window.open("", "_blank");
    if (!win) {
      toast({ title: t("error"), description: t("noDataToExport"), variant: "destructive" });
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
    if (period === "custom" && (!customStart || !customEnd)) {
      toast({ title: t("validation"), description: `${t("date")} ${t("required").toLowerCase()}`, variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const res = await reportsApi.generate({
        period,
        startDate: period === "custom" ? customStart : undefined,
        endDate: period === "custom" ? customEnd : undefined,
        format,
      });

      const { data } = res.data;

      const newReport: ReportRecord = {
        id: data.id,
        period: data.period,
        startDate: data.startDate,
        endDate: data.endDate,
        format: format.toUpperCase(),
        createdAt: data.generatedAt,
        groups: data.groups,
        count: data.count,
      };

      setGeneratedReports((prev) => [newReport, ...prev]);

      toast({
        title: t("success"),
        description: `${data.count} ${t("total").toLowerCase()} ${t("events").toLowerCase()}`,
      });

      if (format === "csv") {
        exportCSV(newReport.groups, `Attendance_Report_${period}.csv`);
      } else if (format === "pdf") {
        exportPDF(newReport);
      }
    } catch (error: any) {
      toast({
        title: t("error"),
        description: error.response?.data?.message || t("error"),
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = (report: ReportRecord) => {
    if (!report.count) {
      toast({ title: t("noData"), description: t("noDataToExport"), variant: "destructive" });
      return;
    }
    if (report.format === "PDF") {
      exportPDF(report);
    } else {
      exportCSV(report.groups, `Attendance_Report_${report.period}.csv`);
    }
  };

  const handleDelete = (id: string) =>
    setGeneratedReports((prev) => prev.filter((r) => r.id !== id));

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold">{t("reports")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("viewManageAttendance")}
        </p>
      </div>

      {/* Generator */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6">{t("add")} {t("reports")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div>
            <Label className="mb-2 block text-sm font-medium">{t("date")}</Label>
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodOption)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this_week">{t("thisWeek")}</SelectItem>
                <SelectItem value="last_week">{t("lastWeek")}</SelectItem>
                <SelectItem value="this_month">{t("thisMonth")}</SelectItem>
                <SelectItem value="last_month">{t("lastMonth")}</SelectItem>
                <SelectItem value="this_year">{t("thisYear")}</SelectItem>
                <SelectItem value="all_time">{t("allTime")}</SelectItem>
                <SelectItem value="custom">{t("customRange")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {period === "custom" && (
            <>
              <div>
                <Label className="mb-2 block text-sm font-medium">{t("date")} *</Label>
                <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
              </div>
              <div>
                <Label className="mb-2 block text-sm font-medium">{t("date")} *</Label>
                <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
              </div>
            </>
          )}

          <div>
            <Label className="mb-2 block text-sm font-medium">{t("category")}</Label>
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
              {t("loading")}
            </span>
          ) : (
            <>{t("add")} {t("reports")}</>
          )}
        </Button>
      </Card>

      {/* Generated Reports */}
      <div>
        <h2 className="text-xl font-semibold mb-4">{t("reports")}</h2>
        {generatedReports.length > 0 ? (
          <div className="space-y-3">
            {generatedReports.map((report) => (
              <Card key={report.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 bg-muted rounded-lg">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">
                        Attendance Report — {PERIOD_LABELS[report.period as PeriodOption] || report.period}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">{report.format}</Badge>
                        <span className="text-xs text-muted-foreground">{report.groups.length} event(s)</span>
                        <span className="text-xs text-muted-foreground">{report.count} records</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(report.createdAt).toLocaleString("id-ID")}
                        </span>
                      </div>

                      {/* Event subheading preview */}
                      {report.groups.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {report.groups.map((g) => (
                            <div key={g.eventCode || g.eventName} className="border-l-2 border-primary/40 pl-3">
                              <p className="text-sm font-medium">{g.eventName}</p>
                              <p className="text-xs text-muted-foreground">
                                {g.dateEvent
                                  ? formatDate(new Date(g.dateEvent), "d MMMM yyyy", { locale: idLocale })
                                  : "-"}
                                {" • "}{g.rows.length} attendance
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 w-full md:w-auto">
                    <Button
                      variant="outline"
                      className="gap-2 flex-1 md:flex-none"
                      onClick={() => handleDownload(report)}
                      disabled={!report.count}
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
            <p className="text-muted-foreground">{t("noReports")}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t("date")}, {t("generateReport").toLowerCase()}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

