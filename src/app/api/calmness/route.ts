import { NextResponse } from "next/server";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(req: Request) {
  try {
    const { sessionId, userId, calmness, flow } = await req.json();

    if (!sessionId || !userId) {
      return NextResponse.json({ error: "Missing sessionId or userId" }, { status: 400 });
    }

    const n = Number(calmness);
    if (!Number.isFinite(n) || n < 1 || n > 5) {
      return NextResponse.json({ error: "Invalid calmness" }, { status: 400 });
    }

    await setDoc(
      doc(db, "sessionSummaries", sessionId),
      {
        userId,
        flow: flow || "daily",
        stage: flow || "daily",
        calmness: n,
        calmnessAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to save calmness", details: e?.message || String(e) },
      { status: 500 }
    );
  }
}
