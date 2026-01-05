import { NextResponse } from "next/server";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

export async function POST(req: Request) {
  const { sessionId, userId, step, contentId, answer, flow } = await req.json();
await setDoc(
  doc(db, "sessionSummaries", sessionId),
  {
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
       flow: flow,
    stage: flow,

   userId,
  },
  { merge: true }
);


  await addDoc(collection(db, "sessions"), {
    createdAt: serverTimestamp(),
    flow: flow,
    stage: flow,
    sessionId,
    step,
    contentId,
    answer,
   userId,
  });
await setDoc(
  doc(db, "sessionSummaries", sessionId),
  {
    answersCount: step + 1,
    lastStep: step,
    updatedAt: serverTimestamp(),
  },
  { merge: true }
);


  return NextResponse.json({ ok: true });
}
