import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  CheckCircle2,
  Crosshair,
  Loader2,
  MapPin,
  Send,
  Sparkles,
  Target,
  CopyCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { PriorityBadge, StatusBadge } from "@/components/campus/Badges";
import { SectionHeader } from "@/components/campus/Cards";
import { PhotoUpload, type UploadPhoto } from "@/components/campus/PhotoUpload";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { analyzeComplaint } from "@/lib/ai";
import {
  CAMPUS_NAME,
  CATEGORIES,
  LOCATIONS,
  PRIORITIES,
  blocksFor,
  floorOptionsFor,
  statusLabel,
  validateCampusLocation,
  type Priority,
} from "@/lib/campus";

export default function ReportProblem() {
  const navigate = useNavigate();
  const create = useMutation(api.complaints.create);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [building, setBuilding] = useState("");
  const [block, setBlock] = useState("");
  const [floor, setFloor] = useState("");
  const [room, setRoom] = useState("");
  const [priorityMode, setPriorityMode] = useState<"auto" | Priority>("auto");
  const [photos, setPhotos] = useState<UploadPhoto[]>([]);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dupDialogOpen, setDupDialogOpen] = useState(false);

  const dupCheck = useQuery(api.complaints.checkDuplicates, {
    title,
    description,
    category,
    building,
  });

  const categoryDef = useMemo(
    () => CATEGORIES.find((c) => c.id === category),
    [category],
  );

  // Dependent location selectors: Building → Block → Floor.
  // Floor options always start at "1st Floor" — there is no ground-floor
  // option, and locations like Indoor Stadium have no floor selector at all.
  const blockOptions = useMemo(() => blocksFor(building), [building]);
  const floorOptions = useMemo(
    () => floorOptionsFor(building, block),
    [building, block],
  );
  const hasNoFloors =
    building !== "" && blockOptions.length === 0 && floorOptions.length === 0;

  // Live AI analysis (mock provider — swap for a server action later).
  const analysis = useMemo(
    () =>
      analyzeComplaint({
        title,
        description,
        categoryHint: category || undefined,
        building: building || undefined,
        block: block || undefined,
        floor: floor || undefined,
        room: room || undefined,
      }),
    [title, description, category, building, block, floor, room],
  );

  const effectivePriority: Priority =
    priorityMode === "auto" ? analysis.priority : priorityMode;
  const duplicateCount = dupCheck?.count ?? 0;

  function captureGps() {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported on this device.");
      return;
    }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsBusy(false);
        toast.success("Location captured from your device.");
      },
      () => {
        setGpsBusy(false);
        toast.error("Location permission denied — you can still set it manually.");
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (title.trim().length < 5) return setError("Please add a clear title (min 5 characters).");
    if (description.trim().length < 15)
      return setError("Please describe the problem in at least 15 characters.");
    if (!category) return setError("Please choose a category.");
    if (!building) return setError("Please choose the building / hostel.");
    if (blockOptions.length > 0 && !block) {
      return setError(`Please choose the block (${blockOptions.join(" / ")}) for ${building}.`);
    }
    const locationError = validateCampusLocation({
      building,
      block: block || undefined,
      floor: floor || undefined,
    });
    if (locationError) return setError(locationError);

    // Duplicate detection: warn (never block) before creating a new complaint.
    if (duplicateCount > 0 && !dupDialogOpen && (dupCheck?.matches.length ?? 0) > 0) {
      setDupDialogOpen(true);
      return;
    }

    await submitNow();
  }

  async function submitNow() {
    setDupDialogOpen(false);
    setSubmitting(true);
    try {
      const ai = {
        ...analysis,
        priority: effectivePriority,
        duplicateCount,
      };
      const { id } = await create({
        title: title.trim(),
        description: description.trim(),
        category,
        subCategory: subCategory || undefined,
        priority: effectivePriority,
        campus: CAMPUS_NAME,
        building,
        block: block || undefined,
        floor: floor || undefined,
        room: room || undefined,
        gpsLat: gps?.lat,
        gpsLng: gps?.lng,
        photos,
        ai,
      });
      toast.success("Complaint submitted", {
        description: `AI routed it to ${analysis.department} as ${effectivePriority.toUpperCase()} priority.`,
      });
      navigate(`/app/complaints/${id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Submission failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="glass-strong glass-edge rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-sky-700">Report a problem</p>
            <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Tell us what&apos;s <span className="text-gradient-brand">broken</span>
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Add a photo, pin the exact location and let CampusGuard AI classify it, suggest a
              priority and route it to the right department — usually in seconds.
            </p>
          </div>
          <div className="glass-soft rounded-2xl px-4 py-2.5 text-center">
            <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
              Next ID
            </p>
            <p className="font-mono text-sm font-bold text-sky-700">CG-2026-••••</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-3">
        {/* Main form */}
        <div className="space-y-4 lg:col-span-2">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-base">Problem details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">Problem title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Water continuously leaking from HR2 third floor ceiling"
                  maxLength={120}
                />
                <p className="text-[11px] text-muted-foreground">{title.length}/120</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Detailed description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  placeholder="Describe what happened, since when, how many people are affected and anything the maintenance team should know…"
                />
                <p className="text-[11px] text-muted-foreground">
                  Minimum 15 characters · {description.length} written
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select
                    value={category}
                    onValueChange={(v) => {
                      setCategory(v);
                      setSubCategory("");
                    }}
                  >
                    <SelectTrigger className="w-full bg-white/70">
                      <SelectValue placeholder="Choose category" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72 bg-white/95 backdrop-blur-xl">
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Sub-category</Label>
                  <Select
                    value={subCategory}
                    onValueChange={setSubCategory}
                    disabled={!categoryDef}
                  >
                    <SelectTrigger className="w-full bg-white/70">
                      <SelectValue
                        placeholder={
                          categoryDef ? "Choose sub-category" : "Pick a category first"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="max-h-72 bg-white/95 backdrop-blur-xl">
                      {(categoryDef?.subCategories ?? []).map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Priority</Label>
                <RadioGroup
                  value={priorityMode}
                  onValueChange={(v) => setPriorityMode(v as "auto" | Priority)}
                  className="flex flex-wrap gap-2"
                >
                  <label className="glass-soft flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm">
                    <RadioGroupItem value="auto" className="sr-only" />
                    <Sparkles className="size-4 text-sky-600" />
                    <span className="font-semibold">
                      AI suggested: {effectivePriority.toUpperCase()}
                    </span>
                  </label>
                  {PRIORITIES.map((p) => (
                    <label
                      key={p.id}
                      className={`glass-soft flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                        priorityMode === p.id ? "ring-2 ring-sky-500/60" : ""
                      }`}
                    >
                      <RadioGroupItem value={p.id} className="sr-only" />
                      <PriorityBadge priority={p.id} />
                    </label>
                  ))}
                </RadioGroup>
                {priorityMode === "auto" && (
                  <p className="text-[11px] text-muted-foreground">
                    AI rules: area leakage → Medium · major electrical fault → High · fire,
                    security or emergency → Critical. You can override it.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-base">Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="glass-soft flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm">
                <MapPin className="size-4 text-sky-600" />
                <span className="font-semibold">{CAMPUS_NAME}</span>
                <span className="text-muted-foreground">· Main Campus</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Building / Hostel</Label>
                  <Select
                    value={building}
                    onValueChange={(v) => {
                      setBuilding(v);
                      setBlock("");
                      setFloor("");
                    }}
                  >
                    <SelectTrigger className="w-full bg-white/70">
                      <SelectValue placeholder="Choose building" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72 bg-white/95 backdrop-blur-xl">
                      {LOCATIONS.map((l) => (
                        <SelectItem key={l.name} value={l.name}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {blockOptions.length > 0 && (
                  <div className="space-y-1.5">
                    <Label>Block</Label>
                    <Select
                      value={block}
                      onValueChange={(v) => {
                        setBlock(v);
                        setFloor("");
                      }}
                    >
                      <SelectTrigger className="w-full bg-white/70">
                        <SelectValue placeholder="Choose block" />
                      </SelectTrigger>
                      <SelectContent className="bg-white/95 backdrop-blur-xl">
                        {blockOptions.map((b) => (
                          <SelectItem key={b} value={b}>
                            {b}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {floorOptions.length > 0 && (
                  <div className="space-y-1.5">
                    <Label>Floor</Label>
                    <Select value={floor} onValueChange={setFloor}>
                      <SelectTrigger className="w-full bg-white/70">
                        <SelectValue placeholder="Choose floor" />
                      </SelectTrigger>
                      <SelectContent className="bg-white/95 backdrop-blur-xl">
                        {floorOptions.map((f) => (
                          <SelectItem key={f} value={f}>
                            {f}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">
                      Floors start at 1st Floor · {floorOptions.length} floors available
                      {block ? ` for ${block}` : ""}
                    </p>
                  </div>
                )}

                {hasNoFloors && (
                  <div className="space-y-1.5">
                    <Label>Floor</Label>
                    <p className="glass-soft rounded-xl px-3 py-2.5 text-xs text-muted-foreground">
                      {building} is stored as a single location without a floor — no floor
                      selector needed.
                    </p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="room">Room / Area</Label>
                  <Input
                    id="room"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    placeholder="e.g. Room 312 / Corridor"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="glass-soft border-white/80"
                  onClick={captureGps}
                  disabled={gpsBusy}
                >
                  {gpsBusy ? (
                    <Loader2 className="mr-1.5 size-4 animate-spin" />
                  ) : (
                    <Crosshair className="mr-1.5 size-4" />
                  )}
                  Capture GPS location
                </Button>
                {gps && (
                  <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700">
                    GPS attached: {gps.lat.toFixed(4)}, {gps.lng.toFixed(4)}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-base">Evidence</CardTitle>
            </CardHeader>
            <CardContent>
              <PhotoUpload value={photos} onChange={setPhotos} />
            </CardContent>
          </Card>
        </div>

        {/* AI sidebar */}
        <div className="space-y-4">
          <div className="glass-strong glass-edge sticky top-20 space-y-4 rounded-2xl p-4">
            <SectionHeader
              title="CampusGuard AI analysis"
              subtitle="Runs as you type"
              icon={<Sparkles className="size-4" />}
            />

            <div className="glass-soft space-y-2 rounded-xl p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Category</span>
                <span className="text-right font-semibold">{analysis.category}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Sub-category</span>
                <span className="text-right font-semibold">{analysis.subCategory}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Priority</span>
                <PriorityBadge priority={effectivePriority} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Department</span>
                <span className="text-right font-semibold">{analysis.department}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Confidence</span>
                <span className="font-semibold text-sky-700">
                  {Math.round(analysis.confidence * 100)}%
                </span>
              </div>
            </div>

            <div className="glass-soft rounded-xl p-3">
              <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-sky-700 uppercase">
                <Target className="size-3.5" /> Summary
              </p>
              <p className="text-sm leading-relaxed">
                {analysis.summary ||
                  "Start typing and AI will summarise your report for the maintenance team."}
              </p>
            </div>

            <div className="glass-soft rounded-xl p-3">
              <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-emerald-700 uppercase">
                <CheckCircle2 className="size-3.5" /> Suggested action
              </p>
              <p className="text-sm leading-relaxed">{analysis.suggestedAction}</p>
            </div>

            <div
              className={`rounded-xl border p-3 text-sm ${
                duplicateCount > 0
                  ? "border-amber-400/50 bg-amber-400/10"
                  : "border-emerald-400/40 bg-emerald-500/10"
              }`}
            >
              <p className="flex items-center gap-1.5 font-semibold">
                <CopyCheck className="size-4" />
                {duplicateCount > 0
                  ? `Possible duplicate complaints: ${duplicateCount}`
                  : "No similar open complaints found"}
              </p>
              {duplicateCount > 0 && dupCheck && dupCheck.matches.length > 0 && (
                <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
                  {dupCheck.matches.map((m) => (
                    <li key={m.complaintId}>
                      <span className="font-mono font-bold text-amber-700">{m.complaintId}</span>{" "}
                      · {m.title}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {error && (
              <p className="rounded-xl border border-rose-300/50 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-700">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-sky-500 to-cyan-600 text-white shadow-lg shadow-sky-500/30 hover:from-sky-600 hover:to-cyan-700"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Submitting…
                </>
              ) : (
                <>
                  <Send className="mr-2 size-4" /> Submit complaint
                </>
              )}
            </Button>
            <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
              <AlertTriangle className="size-3.5" />
              Emergency? Use the SOS button on the Campus Safety page.
            </p>
          </div>
        </div>
      </form>

      <p className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
        <StatusBadge status="submitted" /> Your complaint enters the workflow instantly and you
        get a permanent tracking ID like <span className="font-mono font-bold">CG-2026-0001</span>.
      </p>

      {/* Duplicate warning — offers a choice, never blocks submission */}
      <Dialog open={dupDialogOpen} onOpenChange={setDupDialogOpen}>
        <DialogContent className="bg-white/95 backdrop-blur-xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CopyCheck className="size-5 text-amber-600" /> Similar complaint already exists
            </DialogTitle>
            <DialogDescription>
              CampusGuard AI found {duplicateCount} similar open complaint
              {duplicateCount === 1 ? "" : "s"} on campus. You can follow the existing ticket
              or continue and create a new one.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5">
            {(dupCheck?.matches ?? []).map((m) => (
              <div
                key={m.complaintId}
                className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-extrabold text-sky-700">
                    {m.complaintId}
                  </span>
                  <StatusBadge status={m.status} />
                  <span className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
                    {statusLabel(m.status)}
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold">{m.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{m.location}</p>
              </div>
            ))}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="w-full border-white/80 bg-white/70 sm:w-auto"
              onClick={() => {
                const first = dupCheck?.matches[0];
                setDupDialogOpen(false);
                if (!first) return;
                if (first.mine && first.id) {
                  navigate(`/app/complaints/${first.id}`);
                } else {
                  toast.info("That complaint belongs to another student", {
                    description:
                      "Its ticket ID, problem and status are shown above — continue below to submit your own report.",
                  });
                }
              }}
            >
              View existing complaint
            </Button>
            <Button
              className="w-full bg-gradient-to-r from-sky-500 to-cyan-600 text-white hover:from-sky-600 hover:to-cyan-700 sm:w-auto"
              disabled={submitting}
              onClick={() => void submitNow()}
            >
              {submitting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Send className="mr-2 size-4" />
              )}
              Continue creating new complaint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
