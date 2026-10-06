import { useMutation, useQuery } from "convex/react";
import {
  AlertOctagon,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  GitMerge,
  Loader2,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  Sparkles,
  Star,
  Tag,
  Trash2,
  UserCog,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { CategoryIcon, PriorityBadge, StatusBadge } from "@/components/campus/Badges";
import { EmptyState, SectionHeader } from "@/components/campus/Cards";
import { PhotoGrid, PhotoUpload, type UploadPhoto } from "@/components/campus/PhotoUpload";
import { ActivityFeed, StatusTimeline, type HistoryEntry } from "@/components/campus/Timeline";
import { RequireRole, useAppRole } from "@/components/RequireRole";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CATEGORIES,
  DEPARTMENT_NAMES,
  EMERGENCY_CONTACTS,
  STATUSES,
  isOverdue,
  prioritySlaHours,
} from "@/lib/campus";
import { formatDateTime } from "@/lib/format";

export default function ComplaintDetail() {
  return (
    <RequireRole roles={["student", "teacher", "admin"]}>
      <DetailInner />
    </RequireRole>
  );
}

function DetailInner() {
  const { id } = useParams<{ id: string }>();
  const role = useAppRole();
  const navigate = useNavigate();
  const complaint = useQuery(
    api.complaints.get,
    id ? { id: id as Id<"complaints"> } : "skip",
  );
  const history = useQuery(
    api.complaints.history,
    id ? { complaintId: id as Id<"complaints"> } : "skip",
  );
  const comments = useQuery(
    api.complaints.comments,
    id ? { complaintId: id as Id<"complaints"> } : "skip",
  );

  const [commentBody, setCommentBody] = useState("");

  const addComment = useMutation(api.complaints.addComment);
  const addInternalNote = useMutation(api.complaints.addInternalNote);
  const escalate = useMutation(api.complaints.escalate);

  if (complaint === undefined || history === undefined || comments === undefined) {
    return (
      <div className="space-y-3">
        <div className="glass h-32 animate-pulse rounded-2xl" />
        <div className="glass h-64 animate-pulse rounded-2xl" />
      </div>
    );
  }

  if (complaint === null) {
    return (
      <EmptyState
        icon={<AlertOctagon className="size-5" />}
        title="Complaint not found or access denied"
        description="This complaint doesn't exist, or it belongs to another student."
        action={<Button onClick={() => navigate("/app/complaints")}>Back to complaints</Button>}
      />
    );
  }

  const isStaff = role === "teacher" || role === "admin";
  const overdue = isOverdue(complaint.createdAt, complaint.resolvedAt, complaint.priority);
  const categoryDef = CATEGORIES.find((c) => c.id === complaint.category);

  const activity = [
    ...history.map((h) => ({
      id: h._id as string,
      body: h.note,
      actor: h.actorName,
      role: h.actorRole,
      createdAt: h.createdAt,
      kind: "history" as const,
    })),
    ...comments
      .filter((c) => role === "admin" || c.kind !== "internal_note")
      .map((c) => ({
        id: c._id as string,
        body: c.body,
        actor: c.authorName,
        role: c.authorRole,
        createdAt: c.createdAt,
        kind:
          c.kind === "internal_note"
            ? ("internal" as const)
            : c.kind === "staff_update"
              ? ("staff" as const)
              : c.kind === "admin_update"
                ? ("admin" as const)
                : ("comment" as const),
      })),
  ].sort((a, b) => a.createdAt - b.createdAt);

  async function postComment(kind: "comment" | "staff_update" | "admin_update" | "internal") {
    if (!commentBody.trim()) return;
    try {
      if (kind === "internal") {
        await addInternalNote({ complaintId: id as Id<"complaints">, body: commentBody });
      } else {
        await addComment({ complaintId: id as Id<"complaints">, body: commentBody, kind });
      }
      setCommentBody("");
      toast.success("Update posted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not post");
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="glass-strong glass-edge rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sky-500/15 to-cyan-500/10 text-sky-700">
            <CategoryIcon category={complaint.category} className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-extrabold tracking-tight text-sky-700">
                {complaint.complaintId}
              </span>
              <PriorityBadge priority={complaint.priority} />
              <StatusBadge status={complaint.status} />
              {overdue && (
                <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[11px] font-bold text-rose-700 uppercase">
                  <Clock className="size-3" /> Overdue · SLA {prioritySlaHours(complaint.priority)}h
                </span>
              )}
              {(complaint.reopenedCount ?? 0) > 0 && (
                <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[11px] font-bold text-violet-700">
                  Reopened {(complaint.reopenedCount ?? 0)}×
                </span>
              )}
            </div>
            <h1 className="mt-1.5 text-xl font-extrabold tracking-tight sm:text-2xl">
              {complaint.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" />
                {complaint.building}
                {complaint.block ? ` · ${complaint.block}` : ""}
                {complaint.floor ? ` · ${complaint.floor}` : ""}
                {complaint.room ? ` · ${complaint.room}` : ""}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" />
                Reported {formatDateTime(complaint.createdAt)}
              </span>
              <span className="inline-flex items-center gap-1">
                <UserCog className="size-3.5" />
                {complaint.reporterName}
              </span>
              {complaint.assignedDepartment && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 font-semibold text-foreground">
                  {complaint.assignedDepartment}
                  {complaint.assignedToName ? ` · ${complaint.assignedToName}` : ""}
                </span>
              )}
            </div>
          </div>
        </div>

        {complaint.gpsLat !== undefined && complaint.gpsLng !== undefined && (
          <a
            href={`https://www.google.com/maps?q=${complaint.gpsLat},${complaint.gpsLng}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-500/20"
          >
            GPS location attached · open in maps <ArrowUpRight className="size-3.5" />
          </a>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left: details */}
        <div className="space-y-4 lg:col-span-2">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{complaint.description}</p>
              {complaint.photos.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">
                    Reported photos
                  </p>
                  <PhotoGrid photos={complaint.photos as UploadPhoto[]} />
                </div>
              )}
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-white/70 px-3 py-1 font-semibold">
                  Category: {categoryDef?.label ?? complaint.category}
                </span>
                {complaint.subCategory && (
                  <span className="rounded-full bg-white/70 px-3 py-1 font-semibold">
                    {complaint.subCategory}
                  </span>
                )}
                <span className="rounded-full bg-white/70 px-3 py-1 font-semibold">
                  Reported by {complaint.reporterName}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* AI analysis */}
          {complaint.ai && (
            <div className="glass rounded-2xl p-4">
              <SectionHeader
                title="AI analysis"
                subtitle={`Confidence ${Math.round(complaint.ai.confidence * 100)}% · mock provider`}
                icon={<Sparkles className="size-4" />}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="glass-soft rounded-xl p-3 text-sm">
                  <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                    Summary
                  </p>
                  <p className="mt-1 leading-relaxed">{complaint.ai.summary}</p>
                </div>
                <div className="glass-soft rounded-xl p-3 text-sm">
                  <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                    Suggested action
                  </p>
                  <p className="mt-1 leading-relaxed">{complaint.ai.suggestedAction}</p>
                </div>
                <div className="glass-soft rounded-xl p-3 text-sm">
                  <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                    Routed department
                  </p>
                  <p className="mt-1 font-semibold">{complaint.ai.department}</p>
                </div>
                <div
                  className={`rounded-xl p-3 text-sm ${
                    complaint.ai.duplicateCount > 0
                      ? "border border-amber-400/50 bg-amber-400/10"
                      : "glass-soft"
                  }`}
                >
                  <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                    Duplicate detection
                  </p>
                  <p className="mt-1 font-semibold">
                    {complaint.ai.duplicateCount > 0
                      ? `Possible duplicate complaints: ${complaint.ai.duplicateCount}`
                      : "No related open complaints"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Resolution proof */}
          {complaint.status === "resolved" && (
            <div className="glass-strong glass-edge rounded-2xl p-4">
              <SectionHeader
                title="Resolution proof"
                subtitle={`Resolved ${complaint.resolvedAt ? formatDateTime(complaint.resolvedAt) : ""} by ${complaint.resolvedBy ?? "campus team"}`}
                icon={<CheckCircle2 className="size-4" />}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-1 text-[11px] font-bold text-rose-700 uppercase">
                    Before photo
                  </p>
                  {complaint.photos.length > 0 ? (
                    <PhotoGrid photos={complaint.photos.slice(0, 1) as UploadPhoto[]} />
                  ) : (
                    <div className="grid aspect-4/3 place-items-center rounded-xl border border-dashed border-rose-300/60 bg-rose-500/5 text-xs text-muted-foreground">
                      No before photo
                    </div>
                  )}
                </div>
                <div>
                  <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700 uppercase">
                    After photo
                  </p>
                  {(complaint.resolutionPhotos ?? []).length > 0 ? (
                    <PhotoGrid photos={(complaint.resolutionPhotos ?? []) as UploadPhoto[]} />
                  ) : (
                    <div className="grid aspect-4/3 place-items-center rounded-xl border border-dashed border-emerald-300/60 bg-emerald-500/5 text-xs text-muted-foreground">
                      No proof uploaded
                    </div>
                  )}
                </div>
              </div>
              {complaint.resolutionNote && (
                <p className="glass-soft mt-3 rounded-xl p-3 text-sm">
                  <span className="font-bold">Resolution note:</span> {complaint.resolutionNote}
                </p>
              )}
              {complaint.feedback && (
                <div className="mt-3 rounded-xl border border-sky-300/50 bg-sky-500/10 p-3 text-sm">
                  <p className="flex flex-wrap items-center gap-2 font-bold">
                    <Star className="size-4 fill-amber-400 text-amber-400" />
                    {complaint.feedback.rating}/5 from {complaint.reporterName}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        complaint.feedback.solved
                          ? "bg-emerald-500/15 text-emerald-700"
                          : "bg-rose-500/15 text-rose-700"
                      }`}
                    >
                      {complaint.feedback.solved ? "Problem solved" : "Not solved · flagged"}
                    </span>
                  </p>
                  {complaint.feedback.comment && (
                    <p className="mt-1 font-normal text-muted-foreground">
                      {complaint.feedback.comment}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Activity feed */}
          <div className="glass rounded-2xl p-4">
            <SectionHeader
              title="Updates & comments"
              subtitle="Everything that happened on this complaint"
              icon={<MessageSquare className="size-4" />}
            />
            <ActivityFeed items={activity} />

            <div className="mt-4 space-y-2">
              <Textarea
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                rows={3}
                placeholder={
                  isStaff
                    ? "Add a work note, site update or internal note…"
                    : "Ask a question or add more context…"
                }
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => postComment("comment")}
                  disabled={!commentBody.trim()}
                >
                  <Send className="mr-1.5 size-4" /> Post comment
                </Button>
                {role === "teacher" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="glass-soft border-white/80"
                    onClick={() => postComment("staff_update")}
                    disabled={!commentBody.trim()}
                  >
                    Add work note
                  </Button>
                )}
                {role === "admin" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="glass-soft border-white/80"
                      onClick={() => postComment("admin_update")}
                      disabled={!commentBody.trim()}
                    >
                      Admin update
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="glass-soft border-rose-300/60 text-rose-700"
                      onClick={() => postComment("internal")}
                      disabled={!commentBody.trim()}
                    >
                      Internal note (hidden)
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: timeline + actions */}
        <div className="space-y-4">
          <StatusTimeline status={complaint.status} entries={history as HistoryEntry[]} />

          {role === "student" && <StudentActions complaint={complaint} />}
          {role === "teacher" && <StaffActions complaint={complaint} />}
          {role === "admin" && <AdminActions complaint={complaint} />}

          <div className="glass rounded-2xl p-4">
            <SectionHeader
              title="Need it faster?"
              subtitle="Escalation & contacts"
              icon={<Phone className="size-4" />}
            />
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full glass-soft border-white/80"
                disabled={complaint.status === "resolved"}
                onClick={async () => {
                  try {
                    await escalate({
                      complaintId: complaint._id,
                      reason: "Reporter requested escalation from complaint detail",
                    });
                    toast.success("Escalated to admin", {
                      description:
                        complaint.priority === "critical"
                          ? "Already at CRITICAL priority."
                          : "Priority raised one level and admins notified.",
                    });
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Escalation failed");
                  }
                }}
              >
                <ArrowUpRight className="mr-1.5 size-4" /> Escalate complaint
              </Button>
              <a
                href={`tel:${EMERGENCY_CONTACTS[3].phone.replace(/\s/g, "")}`}
                className="glass-soft flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold"
              >
                CampusGuard helpline <Phone className="size-4 text-rose-600" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* STUDENT ACTIONS                                                     */
/* ================================================================== */

function StudentActions({ complaint }: { complaint: Doc<"complaints"> }) {
  const navigate = useNavigate();
  const submitFeedback = useMutation(api.complaints.submitFeedback);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [solved, setSolved] = useState<"yes" | "no">("yes");
  const [busy, setBusy] = useState(false);

  const canReview = complaint.status === "resolved" && !complaint.feedback;

  if (!canReview) return null;

  return (
    <div className="glass-strong glass-edge rounded-2xl p-4">
      <SectionHeader
        title="Rate the resolution"
        subtitle="Was the problem actually solved?"
        icon={<Star className="size-4" />}
      />
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            aria-label={`${n} star`}
            className="transition hover:scale-110"
          >
            <Star
              className={`size-7 ${
                n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"
              }`}
            />
          </button>
        ))}
      </div>

      <Textarea
        className="mt-3"
        rows={2}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share feedback for the maintenance team…"
      />

      <div className="mt-3">
        <Label>Was the problem actually solved?</Label>
        <RadioGroup
          value={solved}
          onValueChange={(v) => setSolved(v as "yes" | "no")}
          className="mt-1.5 flex gap-2"
        >
          <label
            className={`glass-soft flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
              solved === "yes" ? "ring-2 ring-emerald-500/60" : ""
            }`}
          >
            <RadioGroupItem value="yes" className="sr-only" />
            <CheckCircle2 className="size-4 text-emerald-600" /> Yes, fixed
          </label>
          <label
            className={`glass-soft flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
              solved === "no" ? "ring-2 ring-rose-500/60" : ""
            }`}
          >
            <RadioGroupItem value="no" className="sr-only" />
            <AlertOctagon className="size-4 text-rose-600" /> No, still broken
          </label>
        </RadioGroup>
        {solved === "no" && (
          <p className="mt-2 rounded-xl border border-rose-300/50 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-700">
            Choosing “No” automatically reopens the complaint and flags it for admin review.
          </p>
        )}
      </div>

      <Button
        className="mt-3 w-full"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await submitFeedback({
              complaintId: complaint._id,
              rating,
              comment,
              solved: solved === "yes",
            });
            if (solved === "no") {
              toast.success("Complaint reopened", {
                description: "Admins have been notified for immediate review.",
              });
            } else {
              toast.success("Thanks for your feedback!", {
                description: "+5 points for reviewing a resolution.",
              });
            }
            navigate(0);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not submit feedback");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Star className="mr-2 size-4" />}
        Submit feedback
      </Button>
    </div>
  );
}

/* ================================================================== */
/* STAFF ACTIONS                                                       */
/* ================================================================== */

function StaffActions({ complaint }: { complaint: Doc<"complaints"> }) {
  const updateStatus = useMutation(api.complaints.updateStatus);
  const accept = useMutation(api.complaints.accept);
  const resolve = useMutation(api.complaints.resolve);
  const [note, setNote] = useState("");
  const [proof, setProof] = useState<UploadPhoto[]>([]);
  const [resolveNote, setResolveNote] = useState("");
  const [busy, setBusy] = useState(false);

  const nextStatuses = STATUSES.filter(
    (s) => s.id !== complaint.status && s.id !== "resolved",
  );

  return (
    <div className="space-y-4">
      {complaint.status === "assigned" && (
        <div className="glass-strong glass-edge rounded-2xl p-4">
          <SectionHeader
            title="New assignment"
            subtitle={
              complaint.assignedToName
                ? `Assigned to ${complaint.assignedToName}`
                : "Routed to your department"
            }
            icon={<UserCog className="size-4" />}
          />
          <p className="mb-2 text-xs text-muted-foreground">
            Accepting claims the complaint and moves it to In Progress — the student and admins
            are notified immediately.
          </p>
          <Button
            className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 text-white hover:from-sky-600 hover:to-indigo-700"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await accept({ complaintId: complaint._id });
                toast.success("Assignment accepted", {
                  description: "Status moved to In Progress — the student has been notified.",
                });
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Could not accept assignment");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 size-4" />
            )}
            Accept assignment
          </Button>
        </div>
      )}
      <div className="glass rounded-2xl p-4">
        <SectionHeader title="Update status" subtitle="Staff controls" icon={<Tag className="size-4" />} />
        <div className="space-y-2">
          <Select
            onValueChange={async (v) => {
              setBusy(true);
              try {
                await updateStatus({
                  complaintId: complaint._id,
                  status: v as Doc<"complaints">["status"],
                  note: note.trim() || "Status updated by staff",
                });
                toast.success("Status updated");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Update failed");
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy || complaint.status === "resolved"}
          >
            <SelectTrigger className="w-full bg-white/70">
              <SelectValue placeholder="Move to status…" />
            </SelectTrigger>
            <SelectContent className="bg-white/95 backdrop-blur-xl">
              {nextStatuses.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note for this status change…"
          />
        </div>
      </div>

      <div className="glass-strong glass-edge rounded-2xl p-4">
        <SectionHeader
          title="Resolve complaint"
          subtitle="Upload proof so the student can verify"
          icon={<CheckCircle2 className="size-4" />}
        />
        <PhotoUpload value={proof} onChange={setProof} label="After / fix photos" max={4} />
        <Textarea
          className="mt-3"
          rows={2}
          value={resolveNote}
          onChange={(e) => setResolveNote(e.target.value)}
          placeholder="What was fixed and how? (resolution note)"
        />
        <Button
          className="mt-3 w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700"
          disabled={busy || complaint.status === "resolved" || resolveNote.trim().length < 5}
          onClick={async () => {
            setBusy(true);
            try {
              await resolve({
                complaintId: complaint._id,
                note: resolveNote,
                photos: proof,
              });
              toast.success("Complaint resolved 🎉", {
                description: "The student has been notified to review the proof.",
              });
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Could not resolve");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-2 size-4" />
          )}
          Mark as resolved
        </Button>
      </div>
    </div>
  );
}

/* ================================================================== */
/* ADMIN ACTIONS                                                       */
/* ================================================================== */

function AdminActions({ complaint }: { complaint: Doc<"complaints"> }) {
  const assign = useMutation(api.complaints.assign);
  const updateStatus = useMutation(api.complaints.updateStatus);
  const setPriority = useMutation(api.complaints.setPriority);
  const resolve = useMutation(api.complaints.resolve);
  const reopen = useMutation(api.complaints.reopen);
  const merge = useMutation(api.complaints.merge);
  const remove = useMutation(api.complaints.remove);
  const navigate = useNavigate();

  const users = useQuery(api.profile.listUsers);
  const all = useQuery(api.complaints.list);
  const staffMembers = (users ?? []).filter((u) => u.role === "teacher");

  const [department, setDepartment] = useState(complaint.assignedDepartment ?? "");
  const [staffId, setStaffId] = useState("");
  const [note, setNote] = useState("");
  const [proof, setProof] = useState<UploadPhoto[]>([]);
  const [resolveNote, setResolveNote] = useState("");
  const [targetId, setTargetId] = useState("");
  const [busy, setBusy] = useState(false);

  const mergeCandidates = useMemo(
    () =>
      (all ?? []).filter(
        (c) =>
          c._id !== complaint._id &&
          !c.mergedInto &&
          (c.building === complaint.building || c.category === complaint.category),
      ),
    [all, complaint],
  );

  async function run(label: string, fn: () => Promise<unknown>, okMessage: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(okMessage);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : `${label} failed`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-4">
        <SectionHeader
          title="Assignment"
          subtitle="Route to a department / staff member"
          icon={<UserCog className="size-4" />}
        />
        <div className="space-y-2">
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger className="w-full bg-white/70">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent className="max-h-72 bg-white/95 backdrop-blur-xl">
              {DEPARTMENT_NAMES.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={staffId} onValueChange={setStaffId}>
            <SelectTrigger className="w-full bg-white/70">
              <SelectValue placeholder="Assign to staff member (optional)" />
            </SelectTrigger>
            <SelectContent className="max-h-72 bg-white/95 backdrop-blur-xl">
              <SelectItem value="none">Department queue only</SelectItem>
              {staffMembers.map((s) => (
                <SelectItem key={s._id} value={s._id}>
                  {s.name ?? "Staff"} — {s.department ?? "Campus"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note — used when assigning or changing status"
            rows={2}
            className="bg-white/70"
          />
          <Button
            className="w-full"
            disabled={busy || !department}
            onClick={() =>
              run(
                "Assign",
                () => {
                  const staff = staffMembers.find((s) => s._id === staffId);
                  return assign({
                    complaintId: complaint._id,
                    department,
                    staffUserId: staff?._id,
                    staffName: staff?.name ?? undefined,
                    note: note.trim() || undefined,
                  });
                },
                "Complaint assigned",
              )
            }
          >
            Assign complaint
          </Button>
        </div>
      </div>

      <div className="glass rounded-2xl p-4">
        <SectionHeader title="Status & priority" subtitle="Direct admin control" icon={<Tag className="size-4" />} />
        <div className="space-y-2">
          <Select
            value={complaint.status}
            onValueChange={(v) =>
              run(
                "Status",
                () =>
                  updateStatus({
                    complaintId: complaint._id,
                    status: v as Doc<"complaints">["status"],
                    note: note.trim() || "Status changed by admin",
                  }),
                "Status updated",
              )
            }
            disabled={busy || complaint.status === "resolved"}
          >
            <SelectTrigger className="w-full bg-white/70">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white/95 backdrop-blur-xl">
              {STATUSES.filter((s) => s.id !== "resolved").map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={complaint.priority}
            onValueChange={(v) =>
              run(
                "Priority",
                () =>
                  setPriority({
                    complaintId: complaint._id,
                    priority: v as Doc<"complaints">["priority"],
                  }),
                "Priority updated",
              )
            }
          >
            <SelectTrigger className="w-full bg-white/70">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white/95 backdrop-blur-xl">
              {["low", "medium", "high", "critical"].map((p) => (
                <SelectItem key={p} value={p}>
                  {p.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="glass-soft border-white/80"
              disabled={busy || complaint.status === "resolved"}
              onClick={() =>
                run(
                  "Resolve",
                  () =>
                    resolve({
                      complaintId: complaint._id,
                      note: resolveNote.trim() || "Resolved by admin",
                      photos: proof,
                    }),
                  "Complaint resolved",
                )
              }
            >
              <CheckCircle2 className="mr-1.5 size-4" /> Resolve
            </Button>
            <Button
              variant="outline"
              className="glass-soft border-white/80"
              disabled={busy || complaint.status !== "resolved"}
              onClick={() =>
                run(
                  "Reopen",
                  () =>
                    reopen({
                      complaintId: complaint._id,
                      reason: "Reopened by admin for re-inspection",
                    }),
                  "Complaint reopened",
                )
              }
            >
              <AlertOctagon className="mr-1.5 size-4" /> Reopen
            </Button>
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-4">
        <SectionHeader
          title="Resolution proof"
          subtitle="Attach proof photos + note"
          icon={<CheckCircle2 className="size-4" />}
        />
        <PhotoUpload value={proof} onChange={setProof} label="After photos" max={4} />
        <Textarea
          className="mt-3"
          rows={2}
          value={resolveNote}
          onChange={(e) => setResolveNote(e.target.value)}
          placeholder="Resolution note (used with the Resolve button above)"
        />
      </div>

      <div className="glass rounded-2xl p-4">
        <SectionHeader
          title="Merge duplicate"
          subtitle="Link this complaint to a master report"
          icon={<GitMerge className="size-4" />}
        />
        <div className="space-y-2">
          <Select value={targetId} onValueChange={setTargetId}>
            <SelectTrigger className="w-full bg-white/70">
              <SelectValue placeholder="Choose master complaint" />
            </SelectTrigger>
            <SelectContent className="max-h-72 bg-white/95 backdrop-blur-xl">
              {mergeCandidates.length === 0 && (
                <SelectItem value="none" disabled>
                  No similar complaints
                </SelectItem>
              )}
              {mergeCandidates.map((c) => (
                <SelectItem key={c._id} value={c._id}>
                  {c.complaintId} · {c.title.slice(0, 44)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="w-full glass-soft border-white/80"
            disabled={busy || !targetId || targetId === "none"}
            onClick={() =>
              run(
                "Merge",
                () =>
                  merge({
                    sourceId: complaint._id,
                    targetId: targetId as Id<"complaints">,
                  }),
                "Complaints merged",
              )
            }
          >
            <GitMerge className="mr-1.5 size-4" /> Merge into master
          </Button>
        </div>
      </div>

      <Alert className="border-rose-300/50 bg-rose-500/10">
        <AlertOctagon className="size-4 text-rose-600" />
        <AlertTitle>Danger zone</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>Delete an inappropriate report. This cannot be undone.</p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-rose-300/60 bg-white/70 text-rose-700 hover:bg-rose-500/10"
              >
                <Trash2 className="mr-1.5 size-4" /> Delete report
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-white/95 backdrop-blur-xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {complaint.complaintId}?</AlertDialogTitle>
                <AlertDialogDescription>
                  The complaint, its history and comments will be permanently removed. The
                  reporter will be notified.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-rose-600 hover:bg-rose-700"
                  onClick={async () => {
                    try {
                      await remove({ complaintId: complaint._id });
                      toast.success("Complaint deleted");
                      navigate("/app/complaints");
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Delete failed");
                    }
                  }}
                >
                  Delete permanently
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </AlertDescription>
      </Alert>
    </div>
  );
}
