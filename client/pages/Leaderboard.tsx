import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { mockEvents, getLeaderboardData, mockAchievements } from "@/data/mockData";

const MEDALS = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

export default function Leaderboard() {
  const [selectedEvent, setSelectedEvent] = useState<string>(
    mockEvents[0]?.id.toString() || "1"
  );
  const [period, setPeriod] = useState<"week" | "month" | "semester">("semester");

  const leaderboardData = getLeaderboardData(
    parseInt(selectedEvent),
    period
  );

  const getAchievementBadge = (achievementId: string) => {
    const achievement = mockAchievements.find((a) => a.id === achievementId);
    if (!achievement) return null;
    return (
      <div key={achievementId} title={achievement.name} className="text-2xl">
        {achievement.icon}
      </div>
    );
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold">Leaderboard</h1>
        <p className="text-muted-foreground mt-1">
          Member rankings and achievements by event attendance
        </p>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Select Event</label>
          <Select value={selectedEvent} onValueChange={setSelectedEvent}>
            <SelectTrigger>
              <SelectValue placeholder="Select an event" />
            </SelectTrigger>
            <SelectContent>
              {mockEvents.map((event) => (
                <SelectItem key={event.id} value={event.id.toString()}>
                  {event.eventCode} - {event.eventName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Period</label>
          <Select
            value={period}
            onValueChange={(value) =>
              setPeriod(value as "week" | "month" | "semester")
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="semester">This Season</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Top 3 Winners */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {leaderboardData.slice(0, 3).map((member, index) => (
          <Card
            key={member.userId}
            className="p-6 relative overflow-hidden"
          >
            {/* Medal Background */}
            <div className="absolute -top-12 -right-12 text-8xl opacity-10">
              {MEDALS[index + 1 as keyof typeof MEDALS]}
            </div>

            {/* Content */}
            <div className="relative z-10 text-center">
              <div className="text-5xl mb-2">
                {MEDALS[index + 1 as keyof typeof MEDALS]}
              </div>
              <div className="mb-4">
                <p className="font-semibold text-lg">{member.fullName}</p>
                <p className="text-sm text-muted-foreground">
                  {member.memberId}
                </p>
              </div>

              <div className="space-y-2 mb-4">
                <div>
                  <p className="text-3xl font-bold text-primary">
                    {member.attendancePercentage.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">Attendance</p>
                </div>
                <Progress
                  value={member.attendancePercentage}
                  className="h-2"
                />
              </div>

              {/* Achievements */}
              {member.achievements.length > 0 && (
                <div className="flex gap-2 justify-center flex-wrap">
                  {member.achievements.map((ach) =>
                    getAchievementBadge(ach)
                  )}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Full Leaderboard Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Member ID
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Present
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Late
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Attendance %
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Achievements
                </th>
              </tr>
            </thead>
            <tbody>
              {leaderboardData.map((member, index) => (
                <tr
                  key={member.userId}
                  className="border-b border-border hover:bg-muted/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 font-semibold">
                      {index < 3 ? (
                        <span className="text-xl">
                          {MEDALS[index + 1 as keyof typeof MEDALS]}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          #{index + 1}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium">{member.fullName}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {member.memberId}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className="bg-green-500/20 text-green-600 dark:text-green-400">
                      {member.totalPresent}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">
                      {member.totalLate}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24">
                        <Progress
                          value={member.attendancePercentage}
                          className="h-2"
                        />
                      </div>
                      <span className="text-sm font-medium min-w-12">
                        {member.attendancePercentage.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1 flex-wrap">
                      {member.achievements.length > 0 ? (
                        member.achievements.map((ach) =>
                          getAchievementBadge(ach)
                        )
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No badges
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Achievements Info */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Available Achievements</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockAchievements.map((achievement) => (
            <div
              key={achievement.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
            >
              <div className="text-3xl">{achievement.icon}</div>
              <div>
                <p className="font-medium text-sm">{achievement.name}</p>
                <p className="text-xs text-muted-foreground">
                  {achievement.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}