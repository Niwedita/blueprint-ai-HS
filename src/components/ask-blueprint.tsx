import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Eraser, Loader2, MessageSquare, Send, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { askBlueprint } from "@/lib/chat.functions";
import type { Blueprint } from "@/lib/blueprint.functions";
import { cn } from "@/lib/utils";

type ChatMessage = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Why did you recommend these HubSpot editions?",
  "Why is my readiness score what it is?",
  "Which workflows should be built first?",
  "Can a lower edition work for Marketing Hub?",
  "What implementation risks should I prioritize?",
  "Which integrations are critical?",
  "What additional discovery questions should I ask the client?",
  "What happens if I skip Operations Hub?",
];

export function AskBlueprint({
  blueprint,
  documentText,
}: {
  blueprint: Blueprint;
  documentText: string;
}) {
  const ask = useServerFn(askBlueprint);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q || loading) return;
      const next: ChatMessage[] = [...messages, { role: "user", content: q }];
      setMessages(next);
      setInput("");
      setError(null);
      setLoading(true);
      try {
        const res = await ask({
          data: {
            blueprint: JSON.stringify(blueprint),
            documentText: documentText.slice(0, 120_000),
            messages: next,
          },
        });
        setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      } finally {
        setLoading(false);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    },
    [ask, blueprint, documentText, loading, messages],
  );

  const clear = () => {
    setMessages([]);
    setError(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <section className="mt-10 rounded-2xl border border-border bg-card shadow-panel">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-display text-xl text-foreground">Ask Blueprint AI</h2>
            <p className="text-xs text-muted-foreground">
              Copilot grounded in your discovery document and generated blueprint.
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Eraser className="h-3 w-3" />
            Clear chat
          </button>
        )}
      </header>

      <div ref={scrollRef} className="max-h-[520px] min-h-[280px] overflow-y-auto px-6 py-5">
        {messages.length === 0 ? (
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-3 w-3 text-accent" />
              Suggested questions
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-lg border border-border bg-surface px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:border-accent/40 hover:bg-accent/5"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ol className="space-y-5">
            {messages.map((m, i) => (
              <li key={i}>
                {m.role === "user" ? (
                  <UserBubble content={m.content} />
                ) : (
                  <AssistantBubble content={m.content} />
                )}
              </li>
            ))}
            {loading && (
              <li>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                  Blueprint AI is thinking…
                </div>
              </li>
            )}
          </ol>
        )}
      </div>

      {error && (
        <div className="mx-6 mb-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="border-t border-border p-4"
      >
        <div className="flex items-end gap-2 rounded-xl border border-border bg-background p-2 focus-within:border-accent/50">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Ask about editions, workflows, risks, roadmap…"
            rows={1}
            className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-foreground text-background transition-opacity hover:opacity-90 disabled:opacity-40"
            aria-label="Send message"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Answers use only your discovery document, the generated blueprint, and HubSpot best practices.
        </p>
      </form>
    </section>
  );
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
        {content}
      </div>
    </div>
  );
}

function AssistantBubble({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="group">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-accent/10 text-accent">
          <Sparkles className="h-3 w-3" />
        </span>
        Blueprint AI
      </div>
      <div className="markdown mt-1.5 text-sm leading-relaxed text-foreground">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
      <div className="mt-1.5">
        <button
          type="button"
          onClick={copy}
          className={cn(
            "inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100",
            copied && "opacity-100",
          )}
        >
          {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
