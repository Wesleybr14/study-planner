"use client";
import { useEffect, useRef } from "react";
export function useDialog<T extends HTMLElement>(aberto: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!aberto || !ref.current) return;
    const painel = ref.current,
      anterior = document.activeElement as HTMLElement | null;
    const elementos = () =>
      Array.from(
        painel.querySelectorAll<HTMLElement>(
          'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]',
        ),
      ).filter((e) => e.getClientRects().length > 0);
    const frame = requestAnimationFrame(() =>
      (elementos()[0] ?? painel).focus(),
    );
    function tab(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const lista = elementos(),
        primeiro = lista[0],
        ultimo = lista.at(-1);
      if (!primeiro) {
        e.preventDefault();
        painel.focus();
        return;
      }
      if (
        e.shiftKey &&
        (document.activeElement === primeiro ||
          !painel.contains(document.activeElement))
      ) {
        e.preventDefault();
        ultimo?.focus();
      } else if (
        !e.shiftKey &&
        (document.activeElement === ultimo ||
          !painel.contains(document.activeElement))
      ) {
        e.preventDefault();
        primeiro.focus();
      }
    }
    document.addEventListener("keydown", tab);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", tab);
      anterior?.focus();
    };
  }, [aberto]);
  return ref;
}
