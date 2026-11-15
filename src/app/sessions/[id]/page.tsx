import { Suspense } from "react";
import SessionView from "./SessionView";

export default function SessionPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Chargement…</p>}>
      <SessionView />
    </Suspense>
  );
}
