import { NextResponse } from "next/server";
import admin from "firebase-admin";

function getAdminApp() {
  if (admin.apps.length > 0) return admin.app();

  const raw = process.env.FIREBASE_ADMIN_KEY;
  if (!raw) throw new Error("Missing FIREBASE_ADMIN_KEY env var");

  const serviceAccount = JSON.parse(raw);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  return admin.app();
}

function toDateFromSeconds(s?: number) {
  if (!s) return null;
  return new Date(s * 1000);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const app = getAdminApp();
    const db = app.firestore();

    const snap = await db
      .collection("sessionSummaries")
      .where("userId", "==", userId)
      .orderBy("updatedAt", "desc")
      .get();

    let totalSessions = 0;
    let onboardingSessions = 0;
    let dailySessions = 0;

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    let last7DaysSessions = 0;

    const dayBuckets: Record<string, number> = {};

    snap.docs.forEach((d) => {
      totalSessions += 1;
      const data = d.data() || {};

      const flow = data.flow || data.stage;

      if (flow === "onboarding") onboardingSessions += 1;
      if (flow === "daily") dailySessions += 1;

      const updatedAt = data.updatedAt;
      const seconds = updatedAt?._seconds ?? updatedAt?.seconds ?? null;
      const dt = toDateFromSeconds(seconds || undefined);

      if (dt) {
        const dayKey = dt.toISOString().slice(0, 10);
        dayBuckets[dayKey] = (dayBuckets[dayKey] || 0) + 1;

        if (dt >= sevenDaysAgo) last7DaysSessions += 1;
      }
    });

    return NextResponse.json({
      totalSessions,
      onboardingSessions,
      dailySessions,
      last7DaysSessions,
      dayBuckets,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to load insights", details: e?.message || String(e) },
      { status: 500 }
    );
  }
}
