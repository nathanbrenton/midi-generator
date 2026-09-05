import SchillingerGenerator from "./components/SchillingerGenerator";
import ThreeGeneratorsPanel from "./components/ThreeGeneratorsPanel";
import SampleAnalysisPanel from "./components/SampleAnalysisPanel";
import MotifExplorerPage from "./pages/MotifExplorerPage";
import ComposePage from "./pages/ComposePage";
import AppHeader, { type AppMode } from "./components/AppHeader";
import { useHashRoute } from "./useHashRoute";

export default function App() {
  const hash = useHashRoute();
  const mode: AppMode = hash === "#motif" ? "motif" : hash === "#compose" ? "compose" : "tour";

  return (
    <>
      <AppHeader active={mode} />
      {mode === "motif" && <MotifExplorerPage />}
      {mode === "compose" && <ComposePage />}
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
