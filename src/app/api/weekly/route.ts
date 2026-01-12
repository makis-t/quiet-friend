import { NextResponse } from "next/server";
import admin from "firebase-admin";

function getAdminApp() {
  if (admin.apps.length > 0) return admin.app();

  const raw = process.env.FIREBASE_ADMIN_KEY;
  if (!raw) throw new Error("Missing FIREBASE_ADMIN_KEY env var");

  const serviceAccount = JSON.parse(raw);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

  return admin.app();
}

function msDays(d: number) {
  return d * 24 * 60 * 60 * 1000;
}

function wordFromTexts(texts: string[]) {
  const text = texts.join(" ").toLowerCase();
  const words = text.match(/\b[\p{L}]{3,}\b/gu) || [];
  const counts: Record<string, number> = {};
  for (const w of words) counts[w] = (counts[w] || 0) + 1;
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted.length ? sorted[0][0] : null;
}

function firstWordFromText(text: string) {
  const s = String(text || "").trim().toLowerCase();
  if (!s) return null;
  const w = s.split(/\s+/)[0] || "";
  const cleaned = w.replace(/[^\p{L}\p{N}]+/gu, "");
  return cleaned || null;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    const app = getAdminApp();
    const db = app.firestore();

    const now = Date.now();
    const sevenDaysAgo = new Date(now - msDays(7));
    const fourteenDaysAgo = new Date(now - msDays(14));

    // 1) calmness από sessionSummaries (daily) τελευταίες 14 μέρες
const summariesSnap = await db
  .collection("sessionSummaries")
  .where("userId", "==", userId)
  .where("flow", "==", "daily")
  .where("updatedAt", ">=", fourteenDaysAgo)
  .orderBy("updatedAt", "desc")
  .get();


    const calmThis: number[] = [];
    const calmPrev: number[] = [];

    summariesSnap.docs.forEach((d) => {
      const data = d.data() || {};
      const c = Number(data.calmness);
      if (!Number.isFinite(c)) return;

      const updatedAt = data.updatedAt;
const dt =
  updatedAt?.toDate?.() ??
  (updatedAt?._seconds || updatedAt?.seconds
    ? new Date((updatedAt._seconds ?? updatedAt.seconds) * 1000)
    : null);
if (!dt) return;


      if (dt >= sevenDaysAgo) calmThis.push(c);
      else if (dt >= fourteenDaysAgo) calmPrev.push(c);
    });

    const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

    const calmThisAvg = avg(calmThis);
    const calmPrevAvg = avg(calmPrev);

    // 2) λέξεις από sessions (answers) για shift: last 7 vs prev 7
    const sessionsSnap = await db
      .collection("sessions")
      .where("userId", "==", userId)
      .where("flow", "==", "daily")
      .where("createdAt", ">=", fourteenDaysAgo)
      .orderBy("createdAt", "asc")
      .get();

    const textsThis: string[] = [];
    const textsPrev: string[] = [];

    sessionsSnap.docs.forEach((d) => {
      const data = d.data() || {};
      const answer = String(data.answer || "").trim();
      if (!answer) return;

     const createdAt = data.createdAt;
const dt =
  createdAt?.toDate?.() ??
  (createdAt?._seconds || createdAt?.seconds
    ? new Date((createdAt._seconds ?? createdAt.seconds) * 1000)
    : null);
if (!dt) return;


      if (dt >= sevenDaysAgo) textsThis.push(answer);
      else textsPrev.push(answer);
    });

    const wordThis = wordFromTexts(textsThis);
    const wordPrev = wordFromTexts(textsPrev);

    const shifted = !!(wordThis && wordPrev && wordThis !== wordPrev);

// repetition signal (simple): same first word appears at least 3 times in last 14 days answers
let repeated = false;
try {
  const wordsAll: string[] = [];
  sessionsSnap.docs.forEach((doc) => {
    const data = doc.data() || {};
    const answer = String(data.answer || "").trim();
    const fw = firstWordFromText(answer);
    if (fw) wordsAll.push(fw);
  });

  if (wordsAll.length >= 3) {
    const counts = new Map<string, number>();
    for (const w of wordsAll) counts.set(w, (counts.get(w) || 0) + 1);
    const max = Math.max(...Array.from(counts.values()));
    repeated = max >= 3;
  }
} catch {
  repeated = false;
}

    return NextResponse.json({
      calmThisAvg,
      calmPrevAvg,
      shifted,
      repeated,
      // δεν χρειάζεται να δείξουμε τις λέξεις στο UI, αλλά τις στέλνουμε για debug αν θες
      wordThis,
      wordPrev,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to load weekly", details: e?.message || String(e) },
      { status: 500 }
    );
  }
}
