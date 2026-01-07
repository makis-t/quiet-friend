export const runtime = "nodejs";

import { NextResponse } from "next/server";
import admin from "firebase-admin";

function getAdminDb() {
  if (!admin.apps.length) {
     const raw = process.env.FIREBASE_ADMIN_KEY;
    if (!raw) throw new Error("Missing FIREBASE_ADMIN_KEY env var");

    const serviceAccount = JSON.parse(raw);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  return admin.firestore();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = body?.userId;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const adminDb = getAdminDb();

    const sessionsSnap = await adminDb
      .collection("sessions")
      .where("userId", "==", userId)
      .get();

    const summariesSnap = await adminDb
      .collection("sessionSummaries")
      .where("userId", "==", userId)
      .get();

    const batch = adminDb.batch();
    sessionsSnap.docs.forEach((d) => batch.delete(d.ref));
    summariesSnap.docs.forEach((d) => batch.delete(d.ref));

    await batch.commit();

    return NextResponse.json({
      ok: true,
      deleted: {
        sessions: sessionsSnap.size,
        summaries: summariesSnap.size,
      },
    });
  } catch (err: any) {
    // Δεν πετάμε details προς client (αλλά στο Vercel logs θα φαίνεται)
    console.error("delete-user error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
