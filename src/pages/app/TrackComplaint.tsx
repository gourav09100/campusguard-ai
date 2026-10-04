import { useQuery } from "convex/react";
import { FileSearch, Loader2, Search } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { api } from "@/convex/_generated/api";
import { ComplaintCard } from "@/components/campus/ComplaintCard";
import { EmptyState, SectionHeader } from "@/components/campus/Cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function TrackComplaint() {
  const [code, setCode] = useState("");
  const [submitted, setSubmitted] = useState("");
  const found = useQuery(
    api.complaints.getByCode,
    submitted ? { code: submitted } : "skip",
  );
  const mine = useQuery(api.complaints.listMine);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="glass-strong glass-edge rounded-3xl p-5 sm:p-6">
        <p className="text-sm font-semibold text-sky-700">Track complaint</p>
        <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight sm:text-3xl">
          Where is my <span className="text-gradient-brand">complaint?</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your tracking ID (for example{" "}
          <span className="font-mono font-bold text-foreground">CG-2026-001245</span>) to see the
          live timeline, updates and resolution proof.
        </p>

        <form
          className="mt-4 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(code.trim().toUpperCase());
          }}
        >
          <div className="relative flex-1">
            <Search className="absolute top-3 left-3 size-4 text-muted-foreground" />
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="CG-2026-001245"
              className="pl-9 font-mono uppercase bg-white/70"
            />
          </div>
          <Button type="submit" disabled={!code.trim()}>
            Track
          </Button>
        </form>
      </div>

      {submitted && (
        <div className="glass rounded-2xl p-4">
          <SectionHeader
            title={`Search result for ${submitted}`}
            subtitle="Tracking IDs are case-insensitive"
            icon={<FileSearch className="size-4" />}
          />
          {found === undefined ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Searching…
            </div>
          ) : found === null ? (
            <EmptyState
              icon={<FileSearch className="size-5" />}
              title="No complaint with that ID"
              description="Double-check the code from your submission screen or notification — it looks like CG-2026-001245."
            />
          ) : (
            <ComplaintCard complaint={found} to={`/app/complaints/${found._id}`} showReporter />
          )}
        </div>
      )}

      <div className="glass rounded-2xl p-4">
        <SectionHeader
          title="Your recent tracking IDs"
          subtitle="Tap any card to open the full timeline"
          icon={<FileSearch className="size-4" />}
        />
        {(mine ?? []).length === 0 ? (
          <EmptyState
            icon={<FileSearch className="size-5" />}
            title="No complaints to track yet"
            description="Submit a report and you'll get a tracking ID instantly."
            action={
              <Link
                to="/app/report"
                className="rounded-xl bg-gradient-to-r from-sky-500 to-cyan-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Report a problem
              </Link>
            }
          />
        ) : (
          <div className="space-y-2.5">
            {(mine ?? []).slice(0, 6).map((c) => (
              <ComplaintCard key={c._id} complaint={c} to={`/app/complaints/${c._id}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
