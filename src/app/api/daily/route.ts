import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";

export async function GET() {
  const q = query(
    collection(db, "content"),
    where("flow", "==", "daily"),
    orderBy("step")
  );

  const snap = await getDocs(q);

  const items = snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  return NextResponse.json({ items });
}
