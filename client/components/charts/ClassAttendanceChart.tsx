import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockClasses, getAttendanceStats } from "@/data/mockData";

export function ClassAttendanceChart() {
  const data = mockClasses.map((cls) => {
    const stats = getAttendanceStats(undefined, cls.id);
    return {
      name: cls.classCode,
      present: stats.hadir + stats.terlambat,
      absent: stats.alpha,
      excused: stats.izin + stats.sakit,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Attendance by Class</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="name"
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
            <Bar
              dataKey="present"
              fill="hsl(142 71% 45%)"
              name="Present"
              radius={[8, 8, 0, 0]}
            />
            <Bar
              dataKey="absent"
              fill="hsl(0 84% 60%)"
              name="Absent"
              radius={[8, 8, 0, 0]}
            />
            <Bar
              dataKey="excused"
              fill="hsl(216 98% 52%)"
              name="Excused"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
