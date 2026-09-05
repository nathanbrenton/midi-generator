import SchillingerGenerator from "./components/SchillingerGenerator";
import ThreeGeneratorsPanel from "./components/ThreeGeneratorsPanel";
import SampleAnalysisPanel from "./components/SampleAnalysisPanel";
import MotifExplorerPage from "./pages/MotifExplorerPage";
import { useHashRoute } from "./useHashRoute";

export default function App() {
  const hash = useHashRoute();

  if (hash === "#motif") {
    return <MotifExplorerPage />;
  }

  return (
    <main className="app">
      <h1>Schillinger MIDI Generator</h1>
      <p className="app__intro">
        Generates rhythm from Joseph Schillinger's interference of periodicities and
        melody from his symmetric pitch scales.
      </p>
      <p className="app__intro">
        Prefer a compositional workbench over the chapter-by-chapter tour?{" "}
        <a href="#motif">Try the Motif Explorer →</a>
      </p>
      <SampleAnalysisPanel />
      <SchillingerGenerator>
        <ThreeGeneratorsPanel />
      </SchillingerGenerator>
    </main>
  );
}
