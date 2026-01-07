export const runtime = "nodejs";

import { NextResponse } from "next/server";
import admin from "firebase-admin";

function getAdminDb() {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error("Missing Firebase Admin env vars");
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
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
