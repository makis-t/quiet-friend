import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "./firebase";

export type ContentItem = {
  id: string;
  title?: string;
  type?: string;
  category?: string;
  flow?: string;
  step?: number;
  content?: string;
  active?: boolean;
};

export async function getOnboardingContent(): Promise<ContentItem[]> {
  const ref = collection(db, "content");
  const q = query(
    ref,
    where("flow", "==", "onboarding"),
    where("active", "==", true),
    orderBy("step", "asc")
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}
