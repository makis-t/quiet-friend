import { NextResponse } from "next/server";
import admin from "firebase-admin";
import fs from "fs";

function getAdminApp() {
  if (admin.apps.length > 0) return admin.app();

  // Uses the same local file as delete-user:
  // /Users/trips/quiet-friend/web/firebase-admin-key.json
  const keyPath = `${process.cwd()}/firebase-admin-key.json`;

  if (!fs.existsSync(keyPath)) {
    throw new Error(`Missing firebase-admin-key.json at: ${keyPath}`);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  return admin.app();
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    const limitParam = url.searchParams.get("limit");

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const limitNum = Math.min(Number(limitParam || 20) || 20, 50);

    const app = getAdminApp();
    const db = app.firestore();

    const snap = await db
      .collection("sessionSummaries")
      .where("userId", "==", userId)
      .orderBy("updatedAt", "desc")
      .limit(limitNum)
      .get();

    const items = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to load history", details: e?.message || String(e) },
      { status: 500 }
    );
  }
}
