import "./TourContents.css";

/**
 * A collapsible table of contents for the Chapter Tour, book by book. Each
 * entry scrolls to the section whose title contains `match` -- a code-split
 * panel's placeholder carries the same title, so this works before the
 * panel has loaded, and it scrolls again once the panel arrives. Buttons,
 * not links: the hash is the app's tab route.
 */
const BOOKS: { book: string; title: string; sections: { label: string; match: string }[] }[] = [
  {
    book: "I",
    title: "Theory of Rhythm",
    sections: [
      { label: "Sample analysis", match: "Sample Analysis" },
      { label: "Identify a rhythm and scale", match: "Identify a rhythm" },
      { label: "Resultants (Ch. 2)", match: "Resultant (Theory of Rhythm" },
      { label: "Grouping (Ch. 3)", match: "Grouping" },
      { label: "Three or more generators (Ch. 6)", match: "Three or More Generators" },
      { label: "Instrumental forms (Ch. 7)", match: "Resultants Applied to Instrumental Forms" },
      { label: "Coordination of time structures (Ch. 8)", match: "Coordination of Time Structures" },
      { label: "Homogeneous simultaneity (Ch. 9)", match: "Homogeneous Simultaneity" },
      { label: "Variation techniques (Ch. 10)", match: "Generalization of Variation" },
      { label: "Homogeneous continuity (Ch. 11)", match: "Composition of Homogeneous Rhythmic" },
      { label: "Distributive powers (Ch. 12)", match: "Distributive Powers" },
      { label: "Rhythm styles (Ch. 13)", match: "Evolution of Rhythm Styles" },
      { label: "Variable velocities and rubato (Ch. 14)", match: "Rhythms of Variable Velocities" },
    ],
  },
  {
    book: "II",
    title: "Theory of Pitch-Scales",
    sections: [
      { label: "Pitch scale, melody and harmony", match: "Pitch scale (Theory" },
      { label: "Pitch-scale styles (Ch. 3)", match: "Evolution of Pitch-Scale Styles" },
      { label: "Melodic modulation (Ch. 4)", match: "Melodic Modulation" },
      { label: "Scales in expansion (Ch. 5)", match: "Scales in Expansion" },
      { label: "Symmetrical scales (Ch. 7-8)", match: "Symmetrical Scales" },
    ],
  },
  { book: "III", title: "Geometrical Projections", sections: [{ label: "Inversions and expansions", match: "Geometrical Inversions" }] },
  {
    book: "IV",
    title: "Theory of Melody",
    sections: [
      { label: "Axes of melody (Ch. 3)", match: "The Axes of Melody" },
      { label: "Melodic continuity (Ch. 5-6)", match: "Composition of Melodic Continuity" },
      { label: "Organic forms (Ch. 8)", match: "Organic Forms" },
    ],
  },
  {
    book: "V",
    title: "Special Theory of Harmony",
    sections: [
      { label: "Diatonic cycles (Ch. 1-2, 8)", match: "Diatonic Cycles" },
      { label: "Symmetric harmony (Ch. 3-5)", match: "The Symmetric System of Harmony" },
      { label: "Variable doublings (Ch. 6-7)", match: "Variable Doublings" },
      { label: "Seventh chord (Ch. 9)", match: "The Seventh Chord" },
      { label: "Ninth chord (Ch. 10)", match: "The Ninth Chord" },
      { label: "Eleventh chord (Ch. 11)", match: "The Eleventh Chord" },
      { label: "Hybrid four-part harmony (Ch. 11 D)", match: "Hybrid Four-Part Harmony" },
      { label: "Symmetric progressions (Ch. 12)", match: "Generalization of Symmetric Progressions" },
      { label: "Chromatic system (Ch. 13)", match: "The Chromatic System of Harmony" },
      { label: "Chromatic modulation (Ch. 14)", match: "Modulations in the Chromatic System" },
      { label: "Passing seventh (Ch. 15)", match: "The Passing Seventh Generalized" },
      { label: "Automatic chromatic continuity (Ch. 16)", match: "Automatic Chromatic Continuities" },
      { label: "Hybrid continuities (Ch. 17)", match: "Hybrid Harmonic Continuities" },
      { label: "Linking continuities (Ch. 18)", match: "Linking Harmonic Continuities" },
      { label: "Pedal points (Ch. 19)", match: "Pedal Points" },
      { label: "Melodic figuration (Ch. 20-23)", match: "Melodic Figuration" },
      { label: "Contrapuntal variations (Ch. 24)", match: "Contrapuntal Variations" },
    ],
  },
  {
    book: "VI",
    title: "Correlation of Harmony and Melody",
    sections: [
      { label: "Melodization (Ch. 1-2)", match: "The Melodization of Harmony" },
      { label: "Harmonization (Ch. 3)", match: "The Harmonization of Melody" },
    ],
  },
  { book: "VII", title: "Theory of Counterpoint", sections: [{ label: "Counterpoint, canon, fugue", match: "Theory of Counterpoint" }] },
  { book: "VIII", title: "Instrumental Forms", sections: [{ label: "Instrumental forms", match: "Instrumental Forms (Book VIII)" }] },
  { book: "IX", title: "General Theory of Harmony", sections: [{ label: "Strata", match: "General Theory of Harmony" }] },
  { book: "X", title: "Evolution of Pitch-Families", sections: [{ label: "Pitch-families", match: "Evolution of Pitch-Families" }] },
  { book: "XI", title: "Theory of Composition", sections: [{ label: "Composition", match: "Theory of Composition" }] },
  { book: "XII", title: "Theory of Orchestration", sections: [{ label: "Orchestration", match: "Theory of Orchestration" }] },
];

function sectionFor(match: string): HTMLElement | null {
  const heading = [...document.querySelectorAll<HTMLHeadingElement>(".app h3")].find((h) => h.textContent?.includes(match));
  return heading?.closest("section") ?? heading ?? null;
}

function jumpTo(match: string) {
  const target = sectionFor(match);
  if (!target) return;
  target.scrollIntoView({ block: "start" });
  // Code-split panels replace their placeholders as they arrive -- the target's own and those above
  // it -- so keep the section in place for a moment while the page settles, stopping as soon as the
  // reader scrolls for themselves.
  const settledTop = target.getBoundingClientRect().top;
  let stopped = false;
  const stop = () => (stopped = true);
  const events = ["wheel", "touchstart", "keydown", "mousedown"] as const;
  events.forEach((e) => window.addEventListener(e, stop, { once: true, passive: true }));
  let checks = 0;
  const timer = window.setInterval(() => {
    const section = sectionFor(match);
    if (stopped || !section || ++checks > 16) {
      window.clearInterval(timer);
      events.forEach((e) => window.removeEventListener(e, stop));
      return;
    }
    if (Math.abs(section.getBoundingClientRect().top - settledTop) > 4) section.scrollIntoView({ block: "start" });
  }, 150);
}

export default function TourContents() {
  return (
    <nav className="tour-contents" aria-label="Contents">
      <details>
        <summary>Contents: Books I-XII</summary>
        <ol className="tour-contents__books">
          {BOOKS.map((b) => (
            <li key={b.book}>
              <span className="tour-contents__book">
                Book {b.book}. {b.title}
              </span>
              <ul>
                {b.sections.map((s) => (
                  <li key={s.match}>
                    <button type="button" onClick={() => jumpTo(s.match)}>
                      {s.label}
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </details>
    </nav>
  );
}
