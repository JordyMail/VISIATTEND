import { useState } from "react";
import { Download, FileText } from "lucide-react";
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
import { mockClasses, mockAttendances } from "@/data/mockData";

interface Report {
  id: number;
  name: string;
  type: string;
  class: string;
  period: string;
  format: string;
  createdAt: string;
  size: string;
}

export default function Reports() {
  const [reportType, setReportType] = useState("attendance-summary");
  const [selectedClass, setSelectedClass] = useState<string>(
    mockClasses[0].id.toString()
  );
  const [period, setPeriod] = useState("month");
  const [format, setFormat] = useState("pdf");
  const [generatedReports, setGeneratedReports] = useState<Report[]>([
    {
      id: 1,
      name: "Attendance Summary - CS101 - March 2024",
      type: "Attendance Summary",
      class: "CS101",
      period: "March 2024",
      format: "PDF",
      createdAt: "2024-03-17T10:30:00",
      size: "2.4 MB",
    },
    {
      id: 2,
      name: "Lateness Report - CS102 - March 2024",
      type: "Lateness Report",
      class: "CS102",
      period: "March 2024",
      format: "Excel",
      createdAt: "2024-03-16T14:15:00",
      size: "1.8 MB",
    },
    {
      id: 3,
      name: "Student Performance - Database Systems",
      type: "Student Performance",
      class: "CS201",
      period: "Semester",
      format: "PDF",
      createdAt: "2024-03-15T09:45:00",
      size: "3.1 MB",
    },
  ]);

  const handleGenerateReport = () => {
    const classInfo = mockClasses.find((c) => c.id === parseInt(selectedClass));
    const newReport: Report = {
      id: generatedReports.length + 1,
      name: `${reportType.replace(/-/g, " ")} - ${classInfo?.classCode} - ${period}`,
      type: reportType.replace(/-/g, " "),
      class: classInfo?.classCode || "All",
      period: period,
      format: format.toUpperCase(),
      createdAt: new Date().toISOString(),
      size: `${(Math.random() * 3 + 1).toFixed(1)} MB`,
    };

    setGeneratedReports([newReport, ...generatedReports]);
  };

  const handleDownloadReport = (report: Report) => {
    const content = `Report: ${report.name}\nGenerated: ${report.createdAt}\n\nReport Content...`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.name.replace(/\s+/g, "_")}.${report.format.toLowerCase()}`;
    a.click();
  };

  const handleDeleteReport = (id: number) => {
    setGeneratedReports(generatedReports.filter((r) => r.id !== id));
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold">Reports</h1>
        <p className="text-muted-foreground mt-1">
          Generate and download attendance reports
        </p>
      </div>

      {/* Report Generator */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6">Generate New Report</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <Label htmlFor="reportType" className="mb-2 block text-sm font-medium">
              Report Type
            </Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger id="reportType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="attendance-summary">
                  Attendance Summary
                </SelectItem>
                <SelectItem value="lateness-report">Lateness Report</SelectItem>
                <SelectItem value="student-performance">
                  Student Performance
                </SelectItem>
                <SelectItem value="absence-analysis">
                  Absence Analysis
                </SelectItem>
                <SelectItem value="class-statistics">
                  Class Statistics
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="class" className="mb-2 block text-sm font-medium">
              Class
            </Label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger id="class">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {mockClasses.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id.toString()}>
                    {cls.classCode} - {cls.className}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="period" className="mb-2 block text-sm font-medium">
              Period
            </Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger id="period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="semester">Semester</SelectItem>
                <SelectItem value="year">Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="format" className="mb-2 block text-sm font-medium">
              Format
            </Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger id="format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          className="w-full bg-primary hover:bg-primary/90"
          onClick={handleGenerateReport}
        >
          Generate Report
        </Button>
      </Card>

      {/* Generated Reports */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Generated Reports</h2>

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
                      <p className="font-semibold">{report.name}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {report.type}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {report.format}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {report.size}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(report.createdAt).toLocaleDateString("id-ID")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 w-full md:w-auto">
                    <Button
                      variant="outline"
                      className="gap-2 flex-1 md:flex-none"
                      onClick={() => handleDownloadReport(report)}
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-destructive hover:text-destructive flex-1 md:flex-none"
                      onClick={() => handleDeleteReport(report.id)}
                    >
                      Delete
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
          </Card>
        )}
      </div>

      {/* Report Templates Info */}
      <Card className="p-6 bg-muted/50">
        <h3 className="font-semibold mb-3">Report Templates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="font-medium mb-1">Attendance Summary</p>
            <p className="text-muted-foreground">
              Overview of attendance for selected period and class
            </p>
          </div>
          <div>
            <p className="font-medium mb-1">Lateness Report</p>
            <p className="text-muted-foreground">
              Analysis of late arrivals and patterns
            </p>
          </div>
          <div>
            <p className="font-medium mb-1">Student Performance</p>
            <p className="text-muted-foreground">
              Individual student attendance metrics and trends
            </p>
          </div>
          <div>
            <p className="font-medium mb-1">Absence Analysis</p>
            <p className="text-muted-foreground">
              Detailed breakdown of absences and excused absences
            </p>
          </div>
          <div>
            <p className="font-medium mb-1">Class Statistics</p>
            <p className="text-muted-foreground">
              Comprehensive statistics for entire class
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
