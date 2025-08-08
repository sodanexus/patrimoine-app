
import * as React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "outline"; size?: "sm" | "md" | "icon" };
export function Button({ className, variant="default", size="md", ...props }: Props) {
  const base = "inline-flex items-center justify-center rounded-md border transition-colors";
  const variants = variant === "outline"
    ? "bg-white border-slate-200 text-slate-800 hover:bg-slate-50"
    : "bg-slate-900 border-slate-900 text-white hover:bg-slate-800";
  const sizes = size === "sm" ? "h-8 px-3 text-sm" : size === "icon" ? "h-8 w-8" : "h-9 px-4";
  return <button className={`${base} ${variants} ${sizes} ${className || ""}`} {...props} />;
}
