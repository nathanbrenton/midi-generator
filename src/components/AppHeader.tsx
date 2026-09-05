import "./AppHeader.css";

export type AppMode = "tour" | "motif" | "compose";

const MODES: { mode: AppMode; label: string; href: string }[] = [
  { mode: "tour", label: "Chapter Tour", href: "#/" },
  { mode: "motif", label: "Motif Explorer", href: "#motif" },
  { mode: "compose", label: "Compose", href: "#compose" },
];

export default function AppHeader({ active }: { active: AppMode }) {
  return (
    <header className="app-header">
      <nav className="app-header__nav">
        {MODES.map(({ mode, label, href }) => (
          <a key={mode} href={href} className={mode === active ? "app-header__link app-header__link--active" : "app-header__link"}>
            {label}
          </a>
        ))}
      </nav>
    </header>
  );
}
