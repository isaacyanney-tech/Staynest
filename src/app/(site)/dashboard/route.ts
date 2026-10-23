import { redirect } from "next/navigation";
import { getViewer, homeFor } from "@/lib/auth";

// /dashboard sends each person to the dashboard for their role. redirect()
// keeps the Location relative, so the host the visitor used is preserved.
export async function GET() {
  const viewer = await getViewer();
  redirect(viewer ? homeFor(viewer.role) : "/sign-in?next=/dashboard");
}
