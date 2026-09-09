"use client";

import { useLayoutEffect, useState } from "react";
import { IconMoon, IconSun } from "@/components/Icons";

export type ThemeName = "light" | "dark";

export const THEME_STORAGE_KEY = "vos-theme";

export function readStoredTheme(): ThemeName {
  if (typeof document === "undefined") return "light";
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dark" || attr === "light") return attr;
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    /* ignore */
  }
  return "light";
}

export function applyTheme(theme: ThemeName) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "dark" ? "#0a0a0a" : "#f5f5f5");
}

export function ThemeToggle({
  variant = "ghost",
}: {
  variant?: "ghost" | "menu";
}) {
  const [theme, setTheme] = useState<ThemeName>("light");

  useLayoutEffect(() => {
    setTheme(readStoredTheme());
  }, []);

  function toggle() {
    const current = readStoredTheme();
    const next = current === "light" ? "dark" : "light";
    setTheme(next);
    applyTheme(next);
  }

  const label = theme === "light" ? "Dark theme" : "Light theme";
  const Icon = theme === "light" ? IconMoon : IconSun;

  if (variant === "menu") {
    return (
      <button type="button" className="account-menu-item" role="menuitem" onClick={toggle}>
        <Icon className="nav-ico" />
        {label}
      </button>
    );
  }

  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-label={label} title={label}>
      <Icon />
    </button>
  );
}
