"use client";

import { useEffect, useState, useRef } from "react";

type ContentItem = {
  id: string;
  title?: string;
  step?: number;
  content?: string;
  hint?: string;
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
const DAILY_CLOSING_END = "That’s enough for today.";
const DAILY_CLOSING_CONTINUITY = "We’ll gently continue tomorrow.";


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
const [itemsFlow, setItemsFlow] = useState<"onboarding" | "daily">("onboarding");
  const [reloadKey, setReloadKey] = useState(0);
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
const [dailyCount, setDailyCount] = useState<number | null>(null);
const [showCalmness, setShowCalmness] = useState(false);
const [calmness, setCalmness] = useState<number | null>(null);
const [showSoftBoundary, setShowSoftBoundary] = useState(false);
const [softBoundaryLoading, setSoftBoundaryLoading] = useState(false);


const [weeklyData, setWeeklyData] = useState<any>(null);
const [weeklyLoading, setWeeklyLoading] = useState(false);

  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insights, setInsights] = useState<Insights | null>(null);
const [showWeekly, setShowWeekly] = useState(false);



  useEffect(() => {
    setUserId(getOrCreateUserId());

  }, []);


useEffect(() => {
  async function load() {

    if (flow === "daily" && userId) {
      setSoftBoundaryLoading(true);
      const resCheck = await fetch(`/api/insights?userId=${userId}`);
      const dataCheck = await resCheck.json();

      const today = new Date().toISOString().slice(0, 10);
      const lastDailyDate = dataCheck?.lastDailyDate;

      if (lastDailyDate === today) {
        setShowSoftBoundary(true);
        setSoftBoundaryLoading(false);
        setLoading(false);
        return;
      }

      setSoftBoundaryLoading(false);
    }

    const res = await fetch(`/api/${flow}`);
    const data = await res.json();
    setItems(data.items ?? []);
setItemsFlow(flow);
  }

  load();
}, [flow, userId, reloadKey]);


async function loadHistory() {
  if (!userId) return;
  setHistoryLoading(true);

  const res = await fetch(`/api/history?userId=${userId}&limit=50`);
  const data = await res.json();
  const items = data.items || [];
  setHistoryItems(items);

  if (items.length > 0) {
    const oldest = items[items.length - 1];
    if (oldest.updatedAt?._seconds) {
      const firstDate = new Date(oldest.updatedAt._seconds * 1000);
      const days = (Date.now() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
  if (days >= 7) {
  setShowWeekly(true);
}

    }
  }

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

async function loadDailyCount() {
  if (!userId) return;
  const res = await fetch(`/api/insights?userId=${userId}`);
  const data = await res.json();
  if (typeof data?.dailySessions === "number") {
    setDailyCount(data.dailySessions);
  }
}


useEffect(() => {
  if (showHistory || flow === "daily") loadHistory();
  if (showInsights) loadInsights();
  if (flow === "daily") loadDailyCount();

 if (showWeekly && userId) {
  setWeeklyLoading(true);
fetch(`/api/weekly?userId=${userId}&force=true`)
    .then((r) => r.json())
    .then((d) => setWeeklyData(d))
    .finally(() => setWeeklyLoading(false));
}

}, [showHistory, showInsights, flow, showWeekly, userId]);



   useEffect(() => {
    const t = setTimeout(() => {
      const el = textareaRef.current;
      if (!el) return;

      // force focus + visible caret
      el.focus();
      const v = el.value || "";
      try {
        el.setSelectionRange(v.length, v.length);
      } catch {}
    }, 0);

    return () => clearTimeout(t);
  }, [i, loading]);


  function resetUiState() {
    setSessionId(crypto.randomUUID());
    setI(0);
    setFinished(false);
    setAnswers({});
    setDeleteNotice(null);
  setShowWeekly(false);
setDailyCount(null);

  setShowCalmness(false);
  setCalmness(null);
setShowSoftBoundary(false);
setSoftBoundaryLoading(false);
  setWeeklyData(null);
  setWeeklyLoading(false);
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
    setDailyCount(null);

    setAnswers({});
    setFinished(true);
    setDeleteNotice("Your data has been deleted.");
  } finally {
    setDeletePending(false);
  }
}


  // ✅ One unified button look (so Delete matches the top buttons)
  const buttonStyle: React.CSSProperties = {
    padding: "8px 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.35)",
    background: "transparent",
    fontSize: 14,
    lineHeight: 1,
    opacity: 0.9,
  };
  const activeButtonStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.55)",
    opacity: 1,
  };

  const FlowButtons = () => (
    <div style={{ marginBottom: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
     <button
  style={{ ...buttonStyle, ...(!showHistory && !showInsights && flow === "onboarding" ? activeButtonStyle : {}) }}
  onClick={() => {
    setShowHistory(false);
    setShowInsights(false);
    resetUiState();
    setFlow("onboarding");
  }}
>
  Onboarding
</button>


<button
  style={{ ...buttonStyle, ...(!showHistory && !showInsights && flow === "daily" ? activeButtonStyle : {}) }}
  onClick={() => {
    setShowHistory(false);
    setShowInsights(false);

    if (flow !== "daily") {
      resetUiState();
      setFlow("daily");
      setReloadKey((k) => k + 1);
    }
  }}
>
  Daily
</button>



      <button
           style={{ ...buttonStyle, ...(showHistory ? activeButtonStyle : {}) }}
        onClick={() => {
          setShowHistory((x) => !x);
          setShowInsights(false);
        }}
      >
        History
      </button>

      <button
           style={{ ...buttonStyle, ...(showInsights ? activeButtonStyle : {}) }}
        onClick={() => {
          setShowInsights((x) => !x);
          setShowHistory(false);
        }}
      >
        Insights
      </button>
    </div>
  );

  if (showHistory) {
    return (
      <main style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
<h1 style={{ marginBottom: 12 }}>History</h1>
        <FlowButtons />
        {historyLoading ? (
          <p>Loading…</p>
        ) : historyItems.length === 0 ? (
          <p>No past sessions.</p>
        ) : (
          historyItems.map((h) => (
            <div
              key={h.id}
              style={{ marginBottom: 12, padding: 10, border: "1px solid #333", borderRadius: 8 }}
            >
              <div style={{ opacity: 0.7, fontSize: 12 }}>
                {h.flow} — {h.updatedAt ? new Date(h.updatedAt._seconds * 1000).toLocaleDateString() : ""}
              </div>
              <div style={{ fontSize: 14 }}>Answers: {h.answersCount}</div>
            </div>
          ))
        )}
      </main>
    );
  }


  if (showInsights) {
    return (
      <main style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
        <h1 style={{ marginBottom: 12 }}>Insights</h1>
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

if (showSoftBoundary) {
  return (
    <main style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 12 }}>Quiet Friend</h1>
      <FlowButtons />

      <div style={{ marginTop: 18, padding: 12, border: "1px solid #333", borderRadius: 10 }}>
        <p style={{ fontSize: 15, opacity: 0.85, lineHeight: 1.6 }}>
          That’s enough for today.
        </p>
        <p style={{ fontSize: 14, opacity: 0.7 }}>
          We’ll gently continue tomorrow.
        </p>

        <button
          style={{ marginTop: 14 }}
          onClick={() => {
            setShowSoftBoundary(false);
            resetUiState();
          }}
        >
          Close
        </button>
      </div>
    </main>
  );
}

if (showCalmness) {
  return (
    <main style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 12 }}>Quiet Friend</h1>
      <FlowButtons />

      <div style={{ marginTop: 18, padding: 12, border: "1px solid #333", borderRadius: 10 }}>
        <div style={{ fontSize: 16, opacity: 0.9, marginBottom: 10 }}>
          Right now, how calm do you feel?
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              style={{ ...buttonStyle, ...(calmness === n ? activeButtonStyle : {}) }}
              onClick={() => setCalmness(n)}
            >
              {n}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 12 }}>
          <button
            style={{ ...buttonStyle, opacity: calmness ? 1 : 0.5 }}
            disabled={!calmness}
            onClick={async () => {
              await fetch("/api/calmness", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId, userId, flow: "daily", calmness }),
              });

              setShowCalmness(false);
              setCalmness(null);
              setFinished(true);
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </main>
  );
}


  if (showWeekly) {
    return (
      <main style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
        <h1 style={{ marginBottom: 12 }}>Weekly Reflection</h1>
        <FlowButtons />
        <p style={{ opacity: 0.85, lineHeight: 1.6 }}>
          This week, you wrote a little about what matters to you.
        </p>
        <p style={{ opacity: 0.7 }}>
          There is nothing to fix here — just something to notice.
        </p>
{weeklyLoading ? (
  <p style={{ opacity: 0.7 }}>Loading…</p>
) : weeklyData?.shifted ? (
  <p style={{ marginTop: 14, opacity: 0.85 }}>
    Something in your language has shifted.
  </p>
) : null}

{!weeklyLoading && typeof weeklyData?.calmThisAvg === "number" && (
  <p style={{ marginTop: 10, opacity: 0.85 }}>
    Your calmness felt{" "}
    {typeof weeklyData?.calmPrevAvg === "number"
      ? weeklyData.calmThisAvg >= weeklyData.calmPrevAvg
        ? "a little steadier"
        : "a little less steady"
      : "present"}{" "}
    this week
 {typeof weeklyData?.calmPrevAvg === "number"
  ? ` (${weeklyData.calmPrevAvg.toFixed(1)} → ${weeklyData.calmThisAvg.toFixed(1)}).`
  : ` (${weeklyData.calmThisAvg.toFixed(1)}).`}


  </p>
)}

        <button
          style={{ marginTop: 20 }}
          onClick={() => {
            setShowWeekly(false);
            setFlow("daily");
            resetUiState();
          }}
        >
          Continue
        </button>

      </main>
    );
  }


<button
  style={{ ...buttonStyle, ...(!showHistory && !showInsights && flow === "daily" ? activeButtonStyle : {}) }}
  onClick={async () => {
    setShowHistory(false);
    setShowInsights(false);

    if (flow === "daily") return;

    resetUiState();

    if (userId) {
      setSoftBoundaryLoading(true);
      const resCheck = await fetch(`/api/insights?userId=${userId}`);
      const dataCheck = await resCheck.json();

      const today = new Date().toISOString().slice(0, 10);
      const lastDailyDate = dataCheck?.lastDailyDate;

      if (lastDailyDate === today) {
        setSoftBoundaryLoading(false);
        setFlow("daily");
        setShowSoftBoundary(true);
        return;
      }

      setSoftBoundaryLoading(false);
    }

    const res = await fetch(`/api/daily`);
    const data = await res.json();
    setItems(data.items ?? []);

    setFlow("daily");
  }}
>
  Daily
</button>




  if (finished) {
    // ✅ show Q + A (not step counters)
    const answered = items
      .map((it) => ({ item: it, answer: (answers[it.id] || "").trim() }))
      .filter((x) => x.answer.length > 0);

    return (
      <main style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
            <h1 style={{ marginBottom: 12 }}>Thank you 🤍</h1>
        <FlowButtons />

        {answered.length > 0 && (
          <div style={{ padding: 12, border: "1px solid #333", borderRadius: 10 }}>
{flow === "daily" && (
  <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 10 }}>
    A small reflection from today.
  </div>
)}
         
{answered.map(({ item, answer }, idx) => {
  let displayTitle = item.title;

  if (flow === "daily") {
    if (idx === 0) displayTitle = "What was present today:";
    if (idx === 1) displayTitle = "What felt supportive:";
  }

  return (
    <div key={item.id} style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 15, opacity: 0.9, marginBottom: 4 }}>
        {displayTitle}
      </div>
      <div style={{ whiteSpace: "pre-wrap", opacity: 0.95 }}>
        {answer}
      </div>
    </div>
  );
})}

          </div>
        )}

  {flow === "daily" ? (
  <div style={{ marginTop: 14, opacity: 0.85 }}>
    <p style={{ margin: 0 }}>{DAILY_CLOSING_END}</p>
    <p style={{ margin: 0 }}>{DAILY_CLOSING_CONTINUITY}</p>
  </div>
) : (
  <p style={{ marginTop: 14, opacity: 0.85 }}>We’ll keep this gently in mind.</p>
)}


        {deleteNotice && <p style={{ marginTop: 10, opacity: 0.9 }}>{deleteNotice}</p>}
{deleteNotice === null && (
  <div style={{ marginTop: 10 }}>
    <button
      style={{
        ...buttonStyle,
        opacity: deletePending ? 0.55 : 0.85,
      }}
      onClick={handleDeleteMyData}
      disabled={deletePending}
    >
      {deletePending ? "Deleting…" : "Delete my data"}
    </button>
  </div>
)}

{deleteNotice === "Your data has been deleted." && (
  <div style={{ marginTop: 10 }}>
    <button
      style={buttonStyle}
      onClick={() => {
        resetUiState();
        setDeleteNotice(null);
        setFlow("onboarding");
      }}
    >
      Start fresh
    </button>
  </div>
)}

       {flow !== "daily" && (
  <p style={{ marginTop: 18, opacity: 0.85 }}>You can come back anytime.</p>
)}

      </main>
    );
  }

  const current = items[i];
  const isLast = i >= items.length - 1;

  return (
    <main style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
          <h1 style={{ marginBottom: 12 }}>Quiet Friend</h1>
      <FlowButtons />
      {/* Progress indicator */}
      <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 6 }}>
        {items.length ? `${i + 1}/${items.length}` : ""}
      </div>

   {i === 0 && (
  <>
    <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 6 }}>
      {flow === "daily" ? `Today — ${new Date().toLocaleDateString()}` : "Welcome"}
    </div>

    {flow === "daily" && typeof dailyCount === "number" && (
      <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 10 }}>
        You’ve shown up {dailyCount} times.
      </div>
    )}
  </>
)}

        <div style={{ marginBottom: 14 }}>
  <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, lineHeight: 1.2 }}>
    {current.title}
  </div>
  <div style={{ fontSize: 18, lineHeight: 1.5, opacity: 0.9 }}>
    {current.content}
  </div>
  {current.hint && (
    <div style={{ fontSize: 13, lineHeight: 1.4, opacity: 0.65, marginTop: 10 }}>
      {current.hint}
    </div>
  )}
</div>


        <textarea
        ref={textareaRef}
        autoFocus
        value={answers[current.id] || ""}
        onChange={(e) => setAnswers({ ...answers, [current.id]: e.target.value })}
        style={{
          width: "100%",
          minHeight: 90,
          padding: "10px 12px",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.25)",
          borderRadius: 8,
          color: "#fff",
          caretColor: "#fff",
          outline: "none",
        }}
      />


      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0}>
          Back
        </button>
        <button
onClick={async () => {
  const answer = answers[current.id];

  // save only if user wrote something
  if (answer?.trim()) {
    await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        userId,
        flow,
        step: current.step,
        contentId: current.id,
        answer,
      }),
    });
  }

  // move forward regardless
  if (isLast) {
    if (flow === "daily") {
      setFinished(false);
      setShowCalmness(true);
    } else {
      setFinished(true);
    }
  } else {
    setI((x) => x + 1);
  }
}}
        >
          {isLast ? "Done" : "Continue"}
        </button>
      </div>
    </main>
  );
}
