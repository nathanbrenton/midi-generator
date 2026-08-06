import SchillingerGenerator from "./components/SchillingerGenerator";
import ThreeGeneratorsPanel from "./components/ThreeGeneratorsPanel";
import SampleAnalysisPanel from "./components/SampleAnalysisPanel";

export default function App() {
  return (
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
  );
}
