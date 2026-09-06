import { useState } from "react";
import SchillingerGenerator from "./components/SchillingerGenerator";
import ThreeGeneratorsPanel from "./components/ThreeGeneratorsPanel";
import SampleAnalysisPanel from "./components/SampleAnalysisPanel";
import MotifExplorerPage from "./pages/MotifExplorerPage";
import AppHeader, { type AppMode, type HeaderAction } from "./components/AppHeader";
import { useHashRoute } from "./useHashRoute";

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
      {mode === "motif" && <MotifExplorerPage onHeaderActionChange={setHeaderAction} />}
      {mode === "tour" && (
        <main className="app">
          <h1>Schillinger MIDI Generator</h1>
          <p className="app__intro">
            Generates rhythm from Joseph Schillinger's interference of periodicities and
            melody from his symmetric pitch scales.
          </p>
          <SampleAnalysisPanel />
          <SchillingerGenerator>
            <ThreeGeneratorsPanel />
          </SchillingerGenerator>
        </main>
      )}
    </>
  );
}
