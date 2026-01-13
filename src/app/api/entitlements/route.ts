import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const doc = await adminDb.collection("users").doc(userId).get();

  if (!doc.exists) {
    return NextResponse.json({ isPro: false });
  }

  const data = doc.data();

  return NextResponse.json({
    isPro: data?.isPro === true,
    subscriptionStatus: data?.subscriptionStatus || null,
    currentPeriodEnd: data?.currentPeriodEnd || null,
  });
}
