import { clsx } from "clsx";

type StatusColorStyle = {
  backgroundColor: string;
  borderColor: string;
  color: string;
};

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

const mondayStatusStyles: Record<string, StatusColorStyle> = {
  "Working on it": { backgroundColor: "#ffdab3", borderColor: "#e0a85d", color: "#5c3a00" },
  Started: { backgroundColor: "#a1e3f6", borderColor: "#5abfd9", color: "#06495c" },
  Stuck: { backgroundColor: "#df2f4a", borderColor: "#b71831", color: "#ffffff" },
  Done: { backgroundColor: "#00c875", borderColor: "#05a865", color: "#063b25" },
};

const stageStyles: Record<string, StatusColorStyle> = {
  Confirmed: { backgroundColor: "#007eb5", borderColor: "#00638d", color: "#ffffff" },
  "Initial Detailing": { backgroundColor: "#216edf", borderColor: "#1652a9", color: "#ffffff" },
  "Final Detailing": { backgroundColor: "#579bfc", borderColor: "#2d76d7", color: "#ffffff" },
  "Waiting for Approval": { backgroundColor: "#df2f4a", borderColor: "#b71831", color: "#ffffff" },
  "Waiting on Survey": { backgroundColor: "#ff5ac4", borderColor: "#cf3698", color: "#4f123d" },
  "Waiting on Survey to verify Drawings": { backgroundColor: "#ff5ac4", borderColor: "#cf3698", color: "#4f123d" },
  "Ready for Production": { backgroundColor: "#bca58a", borderColor: "#947a5e", color: "#3d2d1d" },
  "In Production": { backgroundColor: "#cab641", borderColor: "#9e8e2a", color: "#332c00" },
  "Ready for Delivery": { backgroundColor: "#a25ddc", borderColor: "#783cad", color: "#ffffff" },
  Installation: { backgroundColor: "#00c875", borderColor: "#05a865", color: "#063b25" },
  "Post Installation": { backgroundColor: "#c4c4c4", borderColor: "#9a9a9a", color: "#252525" },
  Specification: { backgroundColor: "#fdab3d", borderColor: "#d8891d", color: "#4f2b00" },
  "Snagging o/s": { backgroundColor: "#ffcb00", borderColor: "#d1a600", color: "#3d3200" },
  "Payment Application Made": { backgroundColor: "#06b6d4", borderColor: "#0891b2", color: "#083344" },
  "Payment application made": { backgroundColor: "#06b6d4", borderColor: "#0891b2", color: "#083344" },
  Completed: { backgroundColor: "#84cc16", borderColor: "#65a30d", color: "#1a2e05" },
};

const calcStatusStyles: Record<string, StatusColorStyle> = {
  "Draft - Torcal": { backgroundColor: "#9cd326", borderColor: "#78a61a", color: "#263a00" },
  "Full - Torcal": { backgroundColor: "#00c875", borderColor: "#05a865", color: "#063b25" },
  "Requested - Torcal": { backgroundColor: "#fdab3d", borderColor: "#d8891d", color: "#4f2b00" },
  "Not Require / Non CE Marked": { backgroundColor: "#037f4c", borderColor: "#02613a", color: "#ffffff" },
  "Draft - Considine": { backgroundColor: "#4eccc6", borderColor: "#2ca39d", color: "#053d3a" },
  "Full - Considine": { backgroundColor: "#00a9ff", borderColor: "#007eba", color: "#062d43" },
  "Requested - Considine": { backgroundColor: "#ffcb00", borderColor: "#d1a600", color: "#3d3200" },
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

export function statusStyle(value?: string | null, kind: "monday" | "stage" | "calc" = "monday") {
  if (!value) {
    return undefined;
  }

  const styles =
    kind === "stage"
      ? stageStyles
      : kind === "calc"
        ? calcStatusStyles
        : mondayStatusStyles;

  return styles[value];
}
