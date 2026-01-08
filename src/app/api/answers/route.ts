export const runtime = "nodejs";

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

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    const db = getAdminApp().firestore();

    const snap = await db
      .collection("sessions")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();

    const answers = snap.docs.map((d) => d.data().answer || "").filter(Boolean);

    return NextResponse.json({ answers });
  } catch (e: any) {
    return NextResponse.json({ error: "Failed to load answers", details: e?.message || String(e) }, { status: 500 });
  }
}
