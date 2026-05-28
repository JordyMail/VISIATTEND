// client/pages/admin/Leaderboard.tsx
import UserLeaderboard from "@/pages/user/Leaderboard";

// Admin uses the same leaderboard component as user
export default function AdminLeaderboard() {
  return <UserLeaderboard />;
}