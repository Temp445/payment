"use client";

import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle({
  className,
  showLabel = true,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label="Toggle visual theme"
      title={theme === "dark" ? "Switch to White Theme" : "Switch to Dark Theme"}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition cursor-pointer text-xs font-semibold select-none ${
        theme === "dark"
          ? "bg-slate-800/80 hover:bg-slate-700/80 text-amber-300 border-slate-700 hover:border-slate-600 shadow-sm"
          : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 hover:border-slate-400 shadow-sm"
      } ${className || ""}`}
    >
      {theme === "dark" ? (
        <>
          <Sun className="w-3.5 h-3.5 text-amber-400" />
          {/* {showLabel && <span className="text-[11px] font-semibold text-slate-200">White</span>} */}
        </>
      ) : (
        <>
          <Moon className="w-3.5 h-3.5 text-blue-600" />
          {/* {showLabel && <span className="text-[11px] font-semibold text-slate-800">Dark</span>} */}
        </>
      )}
    </button>
  );
}

