import { useEffect, useRef } from "react";
import gsap from "gsap";

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Staggered reveal of children marked [data-reveal] inside the returned ref. Runs once per dep change. */
export function useReveal<T extends HTMLElement>(deps: unknown[] = []) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!ref.current || reduced()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo("[data-reveal]", { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, stagger: 0.05, ease: "power3.out", clearProps: "transform" });
    }, ref);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

/** Animates a number into an element's textContent without React re-renders. */
export function useCountUp(value: number, decimals = 0) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced()) { el.textContent = value.toFixed(decimals); return; }
    const o = { v: 0 };
    const tw = gsap.to(o, { v: value, duration: 1.1, ease: "power2.out", onUpdate: () => { el.textContent = o.v.toLocaleString("fr-FR", { maximumFractionDigits: decimals, minimumFractionDigits: decimals }); } });
    return () => { tw.kill(); };
  }, [value, decimals]);
  return ref;
}

/** Pointer-driven tilt/spotlight, separate from scroll/entrance transforms (uses CSS vars only). */
export function useSpotlight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced()) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    el.addEventListener("pointermove", move);
    return () => el.removeEventListener("pointermove", move);
  }, []);
  return ref;
}
