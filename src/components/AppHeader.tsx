import { useEffect, useRef, useState } from "react";
import "./AppHeader.css";

export type AppMode = "tour" | "motif";

export interface HeaderAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

const MODES: { mode: AppMode; label: string; href: string }[] = [
  { mode: "tour", label: "Chapter Tour", href: "#/" },
  { mode: "motif", label: "Motif Explorer", href: "#motif" },
];

/**
 * `action` is an overflow-menu item the *current page* wants surfaced here
 * instead of in its own chrome -- e.g. Motif Explorer's rarely-used
 * Download MIDI, kept out of its transport bar entirely rather than just
 * a couple of clicks away within it. Pages opt in by passing `action`;
 * omitting it (or passing null) hides the menu button.
 */
export default function AppHeader({ active, action }: { active: AppMode; action?: HeaderAction | null }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!action) setOpen(false);
  }, [action]);

  return (
    <header className="app-header">
      <nav className="app-header__nav">
        {MODES.map(({ mode, label, href }) => (
          <a key={mode} href={href} className={mode === active ? "app-header__link app-header__link--active" : "app-header__link"}>
            {label}
          </a>
        ))}
        <div className="app-header__spacer" />
        {action && (
          <div className="app-header__overflow" ref={menuRef}>
            <button type="button" aria-label="More options" onClick={() => setOpen((v) => !v)}>
              ⋯
            </button>
            {open && (
              <div className="app-header__menu">
                <button
                  type="button"
                  onClick={() => {
                    action.onClick();
                    setOpen(false);
                  }}
                  disabled={action.disabled}
                >
                  {action.label}
                </button>
              </div>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
