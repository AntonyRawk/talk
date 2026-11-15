import { loadSession } from "@/lib/engine/run";
import { sessionToMarkdown } from "@/lib/export";
import { fail, handle, type Params } from "@/lib/http";

export function GET(_req: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const data = await loadSession(id);
    if (!data) return fail("Session introuvable.", 404);
    return new Response(sessionToMarkdown(data), {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="talk-${id.slice(0, 8)}.md"`,
      },
    });
  });
}
