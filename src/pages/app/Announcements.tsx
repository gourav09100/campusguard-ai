import { useMutation, useQuery } from "convex/react";
import { Megaphone, Pin, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { EmptyState, SectionHeader } from "@/components/campus/Cards";
import { AnnouncementList } from "@/pages/app/dashboard/Shared";
import { useAppRole } from "@/components/RequireRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export default function Announcements() {
  const announcements = useQuery(api.announcements.list);
  const create = useMutation(api.announcements.create);
  const remove = useMutation(api.announcements.remove);
  const role = useAppRole();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<"maintenance" | "emergency" | "event" | "notice" | "general">(
    "notice",
  );
  const [audience, setAudience] = useState<"all" | "students" | "staff">("all");
  const [pinned, setPinned] = useState(false);
  const [busy, setBusy] = useState(false);

  const admin = role === "admin";

  async function publish() {
    if (title.trim().length < 4 || body.trim().length < 10) {
      toast.error("Add a title (4+ chars) and message (10+ chars).");
      return;
    }
    setBusy(true);
    try {
      await create({ title, body, kind, audience, pinned });
      setTitle("");
      setBody("");
      setPinned(false);
      toast.success("Announcement published", { description: "Everyone in the audience was notified." });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="glass-strong glass-edge rounded-3xl p-5 sm:p-6">
        <p className="text-sm font-semibold text-sky-700">Announcements</p>
        <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight sm:text-3xl">
          Campus <span className="text-gradient-brand">bulletin</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Water cuts, power maintenance, safety drills, events and important notices — published
          by admins and delivered to everyone&apos;s notification centre.
        </p>
      </div>

      {admin && (
        <Card className="glass-strong">
          <CardHeader>
            <CardTitle className="text-base">Publish an announcement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ann-title">Title</Label>
              <Input
                id="ann-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Water supply interruption — HR1 & HR2, 6–10 AM"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ann-body">Message</Label>
              <Textarea
                id="ann-body"
                rows={3}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="What is happening, where, when and what people should do…"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
                  <SelectTrigger className="bg-white/70">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 backdrop-blur-xl">
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="emergency">Emergency alert</SelectItem>
                    <SelectItem value="event">Campus event</SelectItem>
                    <SelectItem value="notice">Important notice</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Audience</Label>
                <Select value={audience} onValueChange={(v) => setAudience(v as typeof audience)}>
                  <SelectTrigger className="bg-white/70">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 backdrop-blur-xl">
                    <SelectItem value="all">Everyone</SelectItem>
                    <SelectItem value="students">Students only</SelectItem>
                    <SelectItem value="staff">Staff only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2 pb-1">
                <Switch id="pinned" checked={pinned} onCheckedChange={setPinned} />
                <Label htmlFor="pinned" className="text-sm">
                  Pin to top
                </Label>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={publish} disabled={busy}>
                <Send className="mr-1.5 size-4" /> Publish
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="glass rounded-2xl p-4">
        <SectionHeader
          title="Published announcements"
          subtitle={`${announcements?.length ?? 0} total`}
          icon={<Megaphone className="size-4" />}
          action={
            admin && announcements && announcements.length > 0 ? (
              <span className="text-[11px] text-muted-foreground">
                Manage from each card below
              </span>
            ) : null
          }
        />
        {announcements === undefined ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-white/50" />
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <EmptyState
            icon={<Megaphone className="size-5" />}
            title="No announcements yet"
            description="Admins can publish maintenance windows, events and safety notices here."
          />
        ) : (
          <>
            <AnnouncementList announcements={announcements} />
            {admin && (
              <div className="mt-4 space-y-2">
                <p className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase">
                  <Pin className="size-3.5" /> Admin tools
                </p>
                {announcements.map((a) => (
                  <div
                    key={a._id}
                    className="glass-soft flex items-center justify-between gap-3 rounded-xl p-3"
                  >
                    <p className="min-w-0 truncate text-sm font-semibold">{a.title}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 border-rose-300/60 text-rose-700 hover:bg-rose-500/10"
                      onClick={async () => {
                        await remove({ id: a._id });
                        toast.success("Announcement removed");
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
