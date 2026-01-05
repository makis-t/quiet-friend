"use client";

import { useEffect, useState, useRef } from "react";

type ContentItem = {
  id: string;
  title?: string;
  step?: number;
  content?: string;
  flow?: string;
  active?: boolean;
};

type HistoryItem = {
  id: string;
  flow?: string;
  stage?: string;
  answersCount?: number;
  lastStep?: number;
  createdAt?: any;
  updatedAt?: any;
};

type Insights = {
  totalSessions: number;
  onboardingSessions: number;
  dailySessions: number;
  last7DaysSessions: number;
  dayBuckets: Record<string, number>;
};

const USER_KEY = "quietFriendUserId";

function createNewUserId() {
  const id = crypto.randomUUID();
  localStorage.setItem(USER_KEY, id);
  return id;
}

function getOrCreateUserId() {
  let id = localStorage.getItem(USER_KEY);
  if (!id) id = createNewUserId();
  return id;
}

export default function Home() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [i, setI] = useState(0);
  const [loading, setLoading] = useState(true);
  const [flow, setFlow] = useState<"onboarding" | "daily">("onboarding");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [finished, setFinished] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const [userId, setUserId] = useState<string | null>(null);

  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

  const [showInsights, setShowInsights] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insights, setInsights] = useState<Insights | null>(null);

  useEffect(() => {
    setUserId(getOrCreateUserId());
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch(`/api/${flow}`);
      const data = await res.json();
      setItems(data.items ?? []);
      setLoading(false);
    }
    load();
  }, [flow]);

  async function loadHistory() {
    if (!userId) return;
    setHistoryLoading(true);
    const res = await fetch(`/api/history?userId=${userId}&limit=20`);
    const data = await res.json();
    setHistoryItems(data.items || []);
    setHistoryLoading(false);
  }

  async function loadInsights() {
    if (!userId) return;
    setInsightsLoading(true);
    const res = await fetch(`/api/insights?userId=${userId}`);
    const data = await res.json();
    setInsights(data);
    setInsightsLoading(false);
  }

  useEffect(() => {
    if (showHistory) loadHistory();
    if (showInsights) loadInsights();
  }, [showHistory, showInsights]);

  useEffect(() => {
    const t = setTimeout(() => textareaRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [i, loading]);

  function resetUiState() {
    setSessionId(crypto.randomUUID());
    setI(0);
    setFinished(false);
    setAnswers({});
  }

  async function handleDeleteMyData() {
    if (!userId || deletePending) return;

    try {
      setDeletePending(true);

      const res = await fetch("/api/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        setDeleteNotice("Something went wrong. Please try again.");
        return;
      }

      localStorage.removeItem(USER_KEY);
      const newId = createNewUserId();
      setUserId(newId);

      setAnswers({});
      setFinished(true);
      setDeleteNotice("Your data has been deleted.");
    } finally {
      setDeletePending(false);
    }
  }

  const FlowButtons = () => (
    <div style={{ marginBottom: 12, display: "flex", gap: 10 }}>
      <button onClick={() => { setShowHistory(false); setShowInsights(false); setFlow("onboarding"); resetUiState(); }}>Onboarding</button>
      <button onClick={() => { setShowHistory(false); setShowInsights(false); setFlow("daily"); resetUiState(); }}>Daily</button>
      <button onClick={() => { setShowHistory((x) => !x); setShowInsights(false); }}>History</button>
      <button onClick={() => { setShowInsights((x) => !x); setShowHistory(false); }}>Insights</button>
    </div>
  );

  if (showHistory) {
    return (
      <main style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
        <h1>History</h1>
        <FlowButtons />
        {historyLoading ? <p>Loading…</p> : historyItems.length === 0 ? <p>No past sessions.</p> :
          historyItems.map((h) => (
            <div key={h.id} style={{ marginBottom: 12, padding: 10, border: "1px solid #333", borderRadius: 8 }}>
              <div style={{ opacity: 0.7, fontSize: 12 }}>
                {h.flow} — {h.updatedAt ? new Date(h.updatedAt._seconds * 1000).toLocaleDateString() : ""}
              </div>
              <div style={{ fontSize: 14 }}>Answers: {h.answersCount}</div>
            </div>
          ))
        }
      </main>
    );
  }

  if (showInsights) {
    return (
      <main style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
        <h1>Insights</h1>
        <FlowButtons />
        {insightsLoading || !insights ? (
          <p>Loading…</p>
        ) : (
          <div style={{ lineHeight: 1.7 }}>
            <p style={{ opacity: 0.8, marginBottom: 12 }}>
              A quiet snapshot — no judgement, just visibility.
            </p>
            <div style={{ padding: 12, border: "1px solid #333", borderRadius: 10 }}>
              <p style={{ margin: 0 }}>Total sessions: {insights.totalSessions}</p>
              <p style={{ margin: 0 }}>Daily sessions: {insights.dailySessions}</p>
              <p style={{ margin: 0 }}>Onboarding sessions: {insights.onboardingSessions}</p>
              <p style={{ margin: 0 }}>Last 7 days: {insights.last7DaysSessions}</p>
            </div>
          </div>
        )}
      </main>
    );
  }

  if (loading) return <main style={{ padding: 24 }}>Loading…</main>;

    if (finished) {
    const answered = items
      .map((it) => ({ item: it, answer: (answers[it.id] || "").trim() }))
      .filter((x) => x.answer.length > 0);

    return (
      <main style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
        <h1>Thank you 🤍</h1>
        <FlowButtons />

        {answered.length > 0 && (
          <div style={{ marginTop: 16, padding: 12, border: "1px solid #333", borderRadius: 10 }}>
            <div style={{ fontSize: 12, opacity: 0.65, marginBottom: 10 }}>
              We’ll keep this gently in mind.
            </div>

            {answered.map(({ item, answer }) => (
              <div key={item.id} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 13, opacity: 0.85 }}>{item.title}</div>
                <div style={{ whiteSpace: "pre-wrap" }}>{answer}</div>
              </div>
            ))}
          </div>
        )}

        {deleteNotice && (
          <p style={{ marginTop: 12, opacity: 0.85 }}>
            {deleteNotice}
          </p>
        )}

        <div style={{ marginTop: 16, display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={() => { setDeleteNotice(null); resetUiState(); }}>
            Start again
          </button>

          <button
            onClick={handleDeleteMyData}
            disabled={deletePending}
            style={{
              opacity: deletePending ? 0.5 : 0.6,
              background: "transparent",
              border: "1px solid #333",
              color: "#ddd",
            }}
          >
            {deletePending ? "Deleting…" : "Delete my data"}
          </button>
        </div>
      </main>
    );
  }


  const current = items[i];
  const isLast = i >= items.length - 1;

  return (
    <main style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h1>Quiet Friend</h1>
      <FlowButtons />

      {i === 0 && (
        <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 6 }}>
          {flow === "daily"
            ? `Today — ${new Date().toLocaleDateString()}`
            : "Welcome"}
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <div>{current.title}</div>
        <div>{current.content}</div>
      </div>

      <textarea
        ref={textareaRef}
        value={answers[current.id] || ""}
        onChange={(e) => setAnswers({ ...answers, [current.id]: e.target.value })}
        style={{ width: "100%", minHeight: 80 }}
      />

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0}>Back</button>
        <button
          onClick={async () => {
            const answer = answers[current.id];
            if (answer?.trim()) {
              await fetch("/api/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId, userId, flow, step: current.step, contentId: current.id, answer }),
              });
            }
            if (isLast) setFinished(true);
            else setI((x) => x + 1);
          }}
        >
          {isLast ? "Done" : "Continue"}
        </button>
      </div>
    </main>
  );
}
