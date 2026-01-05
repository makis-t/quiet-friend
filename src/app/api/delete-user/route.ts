export const runtime = "nodejs";

import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { readFileSync } from "fs";
import path from "path";

function getAdminDb() {
  // IMPORTANT: το αρχείο πρέπει να είναι ΕΔΩ: /Users/trips/quiet-friend/web/firebase-admin-key.json
  const keyPath = path.join(process.cwd(), "firebase-admin-key.json");

  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  return admin.firestore();
}

export async function POST(req: Request) {
  const { userId } = await req.json();

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
}
