"use client";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Tilts its child in 3D toward the pointer. Disabled for reduced-motion users
 * and on touch devices, and never intercepts clicks.
 */
export function HeroTilt({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fine = window.matchMedia("(pointer: fine)");
    if (reduce.matches || !fine.matches) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
      const y = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.setProperty("--tilt-x", `${(-y * 8).toFixed(2)}deg`);
        el.style.setProperty("--tilt-y", `${(x * 10).toFixed(2)}deg`);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);
  return (
    <div className="[perspective:1400px]">
      <div
        ref={ref}
        className="pointer-events-none transition-transform duration-300 ease-out [transform:rotateX(var(--tilt-x,0deg))_rotateY(var(--tilt-y,0deg))] [transform-style:preserve-3d]"
      >
        {children}
      </div>
    </div>
  );
}
