// client/components/charts/AttendanceTrendChart.tsx
import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { attendanceApi } from "@/services/api";
import { useLanguage } from "@/lib/i18n";

interface AttendanceTrendChartProps {
  days?: number;
  eventId?: number;
}

interface TrendPoint {
  date: string;
  present: number;
}

export function AttendanceTrendChart({
  days = 7,
  eventId,
}: AttendanceTrendChartProps) {
  const { t } = useLanguage();
  const [data, setData] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrend();
  }, [days, eventId]);

  const fetchTrend = async () => {
    try {
      setLoading(true);
      const response = await attendanceApi.getTrend(days, eventId);
      const trendData = response.data.data;

      // Backend returns an ARRAY of { attendance_date, total, present }
      let chartData: TrendPoint[] = [];
      if (Array.isArray(trendData)) {
        chartData = trendData.map((item: any) => ({
          date: new Date(item.attendance_date).toLocaleDateString("id-ID", {
            month: "short",
            day: "numeric",
          }),
          present: item.present || 0,
        }));
      } else if (typeof trendData === "object" && trendData !== null) {
        // Fallback: handle if object shape is returned
        chartData = Object.entries(trendData).map(([date, count]) => ({
          date: new Date(date).toLocaleDateString("id-ID", {
            month: "short",
            day: "numeric",
          }),
          present: Number(count),
        }));
      }

      setData(chartData);
    } catch (error) {
      console.error("Error fetching attendance trend:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("attendanceTrendChart")}</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("attendanceTrendChart")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={data}
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
            />
            <XAxis
              dataKey="date"
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: "12px" }}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: "12px" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="present"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))", r: 4 }}
              activeDot={{ r: 6 }}
              name={t("present")}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}