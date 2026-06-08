import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { buildEventIcs } from "@/lib/ics";
import type { EventRow } from "@/lib/types";

export const dynamic = "force-dynamic";

// Download an approved event as an .ics file (Apple Calendar, Outlook, …).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const ev = await getDb()
    .prepare("SELECT * FROM events WHERE id = ? AND status = 'approved'")
    .bind(Number(id))
    .first<EventRow>();
  if (!ev) return new Response("Not found", { status: 404 });

  return new Response(buildEventIcs(ev), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="event-${ev.id}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
