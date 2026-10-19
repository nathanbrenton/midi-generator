import { Suspense, useEffect, useRef, useState, type ComponentType, type LazyExoticComponent } from "react";
import "./SchillingerGenerator.css";

/**
 * Mounts a code-split panel once its placeholder comes within reach of the
 * viewport, so the Chapter Tour loads only what is near the top of the page.
 * The placeholder stands in the grid exactly where the panel will (no
 * wrapper element), shows the panel's title, and is the fallback while the
 * chunk loads. Once mounted, a panel stays mounted, keeping its state.
 */
export default function LazyPanel({ component: Panel, label }: { component: LazyExoticComponent<ComponentType>; label: string }) {
  const placeholderRef = useRef<HTMLElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    if (near) return;
    const el = placeholderRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setNear(true), { rootMargin: "1200px 0px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [near]);

  const placeholder = (ref?: React.Ref<HTMLElement>) => (
    <section ref={ref} className="schillinger__section schillinger__section--wide schillinger__placeholder" aria-busy="true">
      <h3>{label}</h3>
      <p className="schillinger__hint">Loading…</p>
    </section>
  );

  return near ? <Suspense fallback={placeholder()}>{<Panel />}</Suspense> : placeholder(placeholderRef);
}
