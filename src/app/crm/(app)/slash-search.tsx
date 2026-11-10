"use client";
import { useEffect } from "react";

/** Desktop shortcut: "/" jumps to the search box unless you're typing somewhere. */
export function SlashToSearch() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      const box = document.getElementById("nav-q") as HTMLInputElement | null;
      if (box) { e.preventDefault(); box.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return null;
}
