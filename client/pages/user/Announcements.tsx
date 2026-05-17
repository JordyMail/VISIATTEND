// client/pages/user/Announcements.tsx
import { useState, useEffect } from "react";
import { Bell, Pin, User, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { announcementApi } from "@/services/api";
import { toast } from "@/components/ui/use-toast";

interface Announcement {
  id: number; title: string; body: string; pinned: boolean;
  author_name?: string; created_at: string;
}

export default function UserAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    announcementApi.getAll()
      .then((r) => setAnnouncements(r.data.data))
      .catch(() => toast({ title: "Error", description: "Gagal memuat pengumuman", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  const filtered = announcements.filter((a) =>
    !search ||
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.body.toLowerCase().includes(search.toLowerCase())
  );

  const pinned  = filtered.filter((a) => a.pinned);
  const regular = filtered.filter((a) => !a.pinned);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const AnnouncementCard = ({ a }: { a: Announcement }) => (
    <Card className={`transition-all hover:shadow-md ${a.pinned ? "border-yellow-300" : ""}`}>
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${a.pinned ? "bg-yellow-100" : "bg-primary/10"}`}>
            {a.pinned
              ? <Pin className="w-4 h-4 text-yellow-600" />
              : <Bell className="w-4 h-4 text-primary" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-base">{a.title}</h3>
              {a.pinned && (
                <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300 text-xs flex-shrink-0">
                  📌 Penting
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed whitespace-pre-wrap">{a.body}</p>
            <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
              {a.author_name && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" /> {a.author_name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {formatDate(a.created_at)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pengumuman</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Informasi dan pemberitahuan terkini</p>
      </div>

      <Input
        placeholder="Cari pengumuman..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Bell className="w-12 h-12 mx-auto text-muted-foreground opacity-30 mb-3" />
            <p className="text-muted-foreground">Tidak ada pengumuman</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {pinned.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                📌 Pengumuman Penting
              </h2>
              {pinned.map((a) => <AnnouncementCard key={a.id} a={a} />)}
            </div>
          )}
          {regular.length > 0 && (
            <div className="space-y-3">
              {pinned.length > 0 && (
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Pengumuman Lainnya
                </h2>
              )}
              {regular.map((a) => <AnnouncementCard key={a.id} a={a} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}