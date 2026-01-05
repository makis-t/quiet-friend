import { NextResponse } from "next/server";
import { getOnboardingContent } from "@/lib/getOnboarding";

export async function GET() {
  const items = await getOnboardingContent();
  return NextResponse.json({ items });
}
