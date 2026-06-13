import { clsx } from "clsx";

const mondayStatusClasses: Record<string, string> = {
  "Working on it": "bg-[#ffdab3] text-[#5c3a00] border-[#e0a85d]",
  Started: "bg-[#a1e3f6] text-[#06495c] border-[#5abfd9]",
  Stuck: "bg-[#df2f4a] text-white border-[#b71831]",
  Done: "bg-[#00c875] text-[#063b25] border-[#05a865]",
};

const stageClasses: Record<string, string> = {
  Confirmed: "bg-[#007eb5] text-white border-[#00638d]",
  "Initial Detailing": "bg-[#216edf] text-white border-[#1652a9]",
  "Final Detailing": "bg-[#579bfc] text-white border-[#2d76d7]",
  "Waiting for Approval": "bg-[#df2f4a] text-white border-[#b71831]",
  "Waiting on Survey": "bg-[#ff5ac4] text-[#4f123d] border-[#cf3698]",
  "Ready for Production": "bg-[#bca58a] text-[#3d2d1d] border-[#947a5e]",
  "In Production": "bg-[#cab641] text-[#332c00] border-[#9e8e2a]",
  "Ready for Delivery": "bg-[#a25ddc] text-white border-[#783cad]",
  Installation: "bg-[#00c875] text-[#063b25] border-[#05a865]",
  "Post Installation": "bg-[#c4c4c4] text-[#252525] border-[#9a9a9a]",
  Specification: "bg-[#fdab3d] text-[#4f2b00] border-[#d8891d]",
};

const calcStatusClasses: Record<string, string> = {
  "Draft - Torcal": "bg-[#9cd326] text-[#263a00] border-[#78a61a]",
  "Full - Torcal": "bg-[#00c875] text-[#063b25] border-[#05a865]",
  "Requested - Torcal": "bg-[#fdab3d] text-[#4f2b00] border-[#d8891d]",
  "Not Require / Non CE Marked": "bg-[#037f4c] text-white border-[#02613a]",
  "Draft - Considine": "bg-[#4eccc6] text-[#053d3a] border-[#2ca39d]",
  "Full - Considine": "bg-[#00a9ff] text-[#062d43] border-[#007eba]",
  "Requested - Considine": "bg-[#ffcb00] text-[#3d3200] border-[#d1a600]",
};

export function statusClass(value?: string | null, kind: "monday" | "stage" | "calc" = "monday") {
  const classes =
    kind === "stage"
      ? stageClasses
      : kind === "calc"
        ? calcStatusClasses
        : mondayStatusClasses;

  return clsx(
    "inline-flex min-h-7 max-w-full items-center rounded border px-2 py-1 text-xs font-semibold leading-tight",
    value && classes[value]
      ? classes[value]
      : "border-slate-200 bg-slate-100 text-slate-700",
  );
}

