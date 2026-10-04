import { useQuery } from "convex/react";
import { Bot, Send, Sparkles, User } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { api } from "@/convex/_generated/api";
import { SectionHeader } from "@/components/campus/Cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ASSISTANT_SUGGESTIONS, assistantReply } from "@/lib/ai";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
}

const GREETING: Message = {
  id: "greeting",
  role: "assistant",
  text: "Hi! I'm the **CampusGuard Assistant**. Ask me how to report a problem, check your complaint status, find emergency contacts or locate campus facilities.",
};

export default function Assistant() {
  const user = useQuery(api.users.currentUser);
  const mine = useQuery(api.complaints.listMine);

  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const context = useMemo(
    () => ({
      userName: user?.name ?? undefined,
      recentComplaints: (mine ?? []).slice(0, 5).map((c) => ({
        complaintId: c.complaintId,
        title: c.title,
        status: c.status,
        building: c.building,
      })),
    }),
    [user, mine],
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, thinking]);

  function ask(text: string) {
    const clean = text.trim();
    if (!clean || thinking) return;
    setInput("");
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", text: clean },
    ]);
    setThinking(true);
    // Mock provider: rule-based answer. Replace with a Convex action that
    // calls a real AI API (server-side key) — same input/output contract.
    window.setTimeout(() => {
      const reply = assistantReply(clean, context);
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", text: reply },
      ]);
      setThinking(false);
    }, 450);
  }

  return (
    <div className="mx-auto flex max-h-[calc(100vh-8rem)] max-w-3xl flex-col space-y-4">
      <div className="glass-strong glass-edge rounded-3xl p-5">
        <p className="text-sm font-semibold text-sky-700">AI Campus Assistant</p>
        <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight">
          Ask <span className="text-gradient-brand">CampusGuard AI</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Answers about reporting, tracking, safety contacts, badges and campus facilities.
        </p>
      </div>

      {/* Suggestions */}
      <div className="flex flex-wrap gap-2">
        {ASSISTANT_SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => ask(s)}
            className="glass-soft rounded-full px-3 py-1.5 text-xs font-semibold text-foreground/80 transition hover:bg-white/80 hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Chat */}
      <div className="glass flex min-h-0 flex-1 flex-col rounded-2xl p-4">
        <SectionHeader
          title="Conversation"
          subtitle="Mock AI provider — swap in a real model later"
          icon={<Sparkles className="size-4" />}
        />
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : ""}`}
            >
              {m.role === "assistant" && (
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-md shadow-sky-500/30">
                  <Bot className="size-4" />
                </span>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-gradient-to-r from-sky-500 to-cyan-600 text-white shadow-md shadow-sky-500/30"
                    : "glass-soft"
                }`}
              >
                <p className="whitespace-pre-wrap">{renderBold(m.text)}</p>
                {m.role === "assistant" && m.text.includes("Report Problem") && (
                  <Link
                    to="/app/report"
                    className="mt-2 inline-block rounded-lg bg-white/85 px-3 py-1.5 text-xs font-bold text-sky-700 shadow-sm"
                  >
                    Open Report Problem →
                  </Link>
                )}
              </div>
              {m.role === "user" && (
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/80 text-sky-700 shadow-sm">
                  <User className="size-4" />
                </span>
              )}
            </div>
          ))}
          {thinking && (
            <div className="flex gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sky-500 to-cyan-600 text-white">
                <Bot className="size-4" />
              </span>
              <div className="glass-soft rounded-2xl px-3.5 py-3">
                <span className="flex gap-1">
                  <span className="size-1.5 animate-bounce rounded-full bg-sky-500 [animation-delay:-0.2s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-sky-500 [animation-delay:-0.1s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-sky-500" />
                </span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about complaints, safety, badges…"
            className="bg-white/70"
          />
          <Button type="submit" disabled={!input.trim() || thinking}>
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

/** Minimal **bold** rendering without a markdown dependency. */
function renderBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      part
    ),
  );
}
