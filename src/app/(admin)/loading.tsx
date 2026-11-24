import React from "react";
import { Loader2 } from "lucide-react";

export default function NormalLoading() {
  return (
    <div className="w-full min-h-[50vh] flex flex-col items-center justify-center p-6 sm:p-12 animate-in fade-in duration-150">
      <div className="flex flex-col items-center gap-3.5 p-6 sm:p-8 rounded-2xl bg-[var(--card)]/80  backdrop-blur max-w-sm w-full text-center">
        {/* <div className="w-12 h-12  flex items-center justify-center text-blue-500">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div> */}
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Loading...</h3>
          {/* <p className="text-xs text-[var(--muted-foreground)]">Please wait while data is being loaded</p> */}
        </div>
      </div>
    </div>
  );
}
