import { lazy, Suspense, useState } from "react";
import SchillingerGenerator from "./components/SchillingerGenerator";
import ThreeGeneratorsPanel from "./components/ThreeGeneratorsPanel";
import SampleAnalysisPanel from "./components/SampleAnalysisPanel";
import AppHeader, { type AppMode, type HeaderAction } from "./components/AppHeader";
import TourContents from "./components/TourContents";
import { useHashRoute } from "./useHashRoute";

// The Motif Explorer is its own chunk, loaded when its tab is first opened.
const MotifExplorerPage = lazy(() => import("./pages/MotifExplorerPage"));

export default function App() {
  const hash = useHashRoute();
  const mode: AppMode = hash === "#motif" ? "motif" : "tour";

  // Pages opt into a header-level overflow action (e.g. Motif Explorer's
  // Download MIDI) by reporting it here. No extra clearing-on-mode-switch
  // effect is needed: the registering page's own effect cleanup already
  // clears it on unmount (see MotifExplorerPage), which is exactly when a
  // stale action would otherwise linger.
  const [headerAction, setHeaderAction] = useState<HeaderAction | null>(null);

  return (
    <>
      <AppHeader active={mode} action={headerAction} />
      {mode === "motif" && (
        <Suspense fallback={<main className="app" aria-busy="true" />}>
          <MotifExplorerPage onHeaderActionChange={setHeaderAction} />
        </Suspense>
      )}
      {mode === "tour" && (
        <main className="app">
          <h1>Schillinger MIDI Generator</h1>
          <p className="app__intro">
            Generates rhythm from Joseph Schillinger's interference of periodicities and
            melody from his symmetric pitch scales.
          </p>
          <TourContents />
          <SampleAnalysisPanel />
          <SchillingerGenerator>
            <ThreeGeneratorsPanel />
          </SchillingerGenerator>
        </main>
      )}
    </>
  );
}
