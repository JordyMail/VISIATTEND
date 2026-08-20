// client/components/charts/StatusDistributionChart.tsx
import { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { attendanceApi } from "@/services/api";
import { useLanguage } from "@/lib/i18n";

interface StatusDistributionChartProps {
  userId?: number;
  eventId?: number;
}

interface ChartEntry {
  name: string;
  value: number;
  color: string;
}

export function StatusDistributionChart({
  userId,
  eventId,
}: StatusDistributionChartProps) {
  const { t } = useLanguage();
  const [data, setData] = useState<ChartEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [userId, eventId]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await attendanceApi.getAll({ userId, eventId });
      const attendances: any[] = response.data.data || [];

      const stats = {
        present: attendances.filter((a) => a.status === "present").length,
        late: attendances.filter((a) => a.status === "late").length,
        excused: attendances.filter((a) => a.status === "excused").length,
        sick: attendances.filter((a) => a.status === "sick").length,
        absent: attendances.filter((a) => a.status === "absent").length,
      };

      const chartData: ChartEntry[] = [
        { name: t("present"), value: stats.present, color: "hsl(142 71% 45%)" },
        { name: t("late"), value: stats.late, color: "hsl(38 92% 50%)" },
        { name: t("excusedSick"), value: stats.excused, color: "hsl(216 98% 52%)" },
        { name: t("sick"), value: stats.sick, color: "hsl(54 100% 50%)" },
        { name: t("absent"), value: stats.absent, color: "hsl(0 84% 60%)" },
      ].filter((item) => item.value > 0);

      setData(chartData);
    } catch (error) {
      console.error("Error fetching status distribution:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("attendanceStatusDistribution")}</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("attendanceStatusDistribution")}</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground text-sm">{t("noData")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("attendanceStatusDistribution")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              formatter={(value: number) => `${value} members`}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}