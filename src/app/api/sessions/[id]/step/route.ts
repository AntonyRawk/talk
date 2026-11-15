import { NextResponse } from "next/server";
import { currentTurn, loadSession, prepareAiTurn, tryLock } from "@/lib/engine/run";
import { fail, handle, type Params } from "@/lib/http";

/**
 * Joue le prochain tour d'une session.
 * - Tour d'une IA : renvoie le texte en direct (text/plain), puis l'enregistre.
 * - Tour d'un humain : renvoie {waiting: "human"} sans rien faire.
 * - Session finie : renvoie {done: true}.
 * Si le fournisseur échoue, le tour n'est pas enregistré et peut être relancé.
 */
export function POST(req: Request, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const data = await loadSession(id);
    if (!data) return fail("Session introuvable.", 404);
    const turn = currentTurn(data);
    if (!turn) return NextResponse.json({ done: true });
    if (turn.isHuman) return NextResponse.json({ waiting: "human", turn });

    const unlock = tryLock(id);
    if (!unlock) return fail("Un tour est déjà en cours pour cette session.", 409);

    let ai;
    try {
      ai = await prepareAiTurn(data, turn, req.signal);
    } catch (err) {
      unlock();
      throw err;
    }

    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        let text = "";
        try {
          for await (const chunk of ai.stream) {
            text += chunk;
            controller.enqueue(encoder.encode(chunk));
          }
          await ai.save(text);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`Tour échoué (${ai.seatName}, ${turn.phase}) :`, message);
          controller.enqueue(encoder.encode(`\n\n[[ERREUR]] ${message}`));
        } finally {
          unlock();
          controller.close();
        }
      },
    });

    return new Response(body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Turn-Seat": turn.seatId,
        "X-Turn-Phase": turn.phase,
      },
    });
  });
}
