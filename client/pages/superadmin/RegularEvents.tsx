// client/pages/superadmin/RegularEvents.tsx
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Calendar, Loader2, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { regularEventApi } from "@/services/api";
import { toast } from "@/components/ui/use-toast";

interface RegularEvent {
  id: number;
  event_code: string;
  event_name: string;
}

export default function RegularEventsPage() {
  const [events, setEvents] = useState<RegularEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Add / Edit Modal state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RegularEvent | null>(null);
  const [eventName, setEventName] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete Modal state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState<RegularEvent | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const response = await regularEventApi.getAll();
      setEvents(response.data.data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Gagal memuat Regular Event",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setEventName("");
    setDialogOpen(true);
  };

  const openEdit = (event: RegularEvent) => {
    setEditing(event);
    setEventName(event.event_name);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!eventName.trim()) {
      return toast({
        title: "Validasi",
        description: "Nama event wajib diisi",
        variant: "destructive",
      });
    }

    setSaving(true);
    try {
      if (editing) {
        await regularEventApi.update(editing.id, { eventName: eventName.trim() });
        toast({ title: "Berhasil", description: "Regular Event berhasil diperbarui" });
      } else {
        await regularEventApi.create({ eventName: eventName.trim() });
        toast({ title: "Berhasil", description: "Regular Event berhasil dibuat" });
      }
      setDialogOpen(false);
      loadEvents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Gagal menyimpan Regular Event",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const openDeleteConfirm = (event: RegularEvent) => {
    setDeletingEvent(event);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingEvent) return;

    setDeleting(true);
    try {
      await regularEventApi.delete(deletingEvent.id);
      toast({ title: "Berhasil", description: "Regular Event berhasil dihapus" });
      setDeleteConfirmOpen(false);
      loadEvents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Gagal menghapus Regular Event",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeletingEvent(null);
    }
  };

  const filteredEvents = events.filter((e) =>
    e.event_name.toLowerCase().includes(search.toLowerCase()) ||
    e.event_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6 text-purple-600" /> Regular Event
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Daftar event gereja/organisasi yang bersifat berkala dan regular
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-purple-600 hover:bg-purple-700 text-white">
          <Plus className="w-4 h-4" /> Add Regular Event
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center max-w-sm relative">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3" />
        <Input
          placeholder="Cari Event Code atau Event Name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Main Table Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      ) : filteredEvents.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Calendar className="w-12 h-12 mx-auto opacity-30 mb-3 text-purple-600" />
            <p className="text-muted-foreground">Belum ada Regular Event</p>
            <Button onClick={openCreate} className="mt-4 gap-2 bg-purple-600 hover:bg-purple-700 text-white">
              <Plus className="w-4 h-4" /> Tambah Pertama
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden border border-muted">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[80px] text-center font-semibold">No.</TableHead>
                <TableHead className="w-[150px] font-semibold">Event Code</TableHead>
                <TableHead className="font-semibold">Event Name</TableHead>
                <TableHead className="w-[200px] text-right font-semibold">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.map((e, index) => (
                <TableRow key={e.id} className="hover:bg-muted/30">
                  <TableCell className="text-center font-medium">{index + 1}</TableCell>
                  <TableCell className="font-mono text-purple-600 font-semibold">{e.event_code}</TableCell>
                  <TableCell className="font-medium text-foreground">{e.event_name}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(e)}
                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteConfirm(e)}
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Regular Event" : "Add Regular Event"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Ubah nama regular event. Kode event bersifat permanen."
                : "Masukkan nama regular event. Kode event akan dibuat otomatis."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {editing && (
              <div>
                <Label className="mb-1.5 block text-muted-foreground">Event Code</Label>
                <Input value={editing.event_code} disabled className="bg-muted font-mono" />
              </div>
            )}
            <div>
              <Label htmlFor="eventName" className="mb-1.5 block">
                Event Name
              </Label>
              <Input
                id="eventName"
                placeholder="cth: Sunday Service, Bible Study..."
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">
              Delete Regular Event?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{deletingEvent?.event_name}"</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
