"use client";

import { forwardRef } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type FloatingFieldProps = Omit<
  React.ComponentProps<typeof Input>,
  "placeholder"
> & {
  label: string;
  hint?: string;
};

export const FloatingField = forwardRef<HTMLInputElement, FloatingFieldProps>(
  ({ label, id, className, hint, ...props }, ref) => {
    const fieldId = id ?? label.replace(/\s+/g, "-").toLowerCase();
    return (
      <div className="space-y-1">
        <div className="relative">
          <Input
            ref={ref}
            id={fieldId}
            placeholder=" "
            className={cn(
              "peer h-14 pt-5 pb-2 text-[15px] shadow-none transition-[border-color,box-shadow] duration-200",
              "focus-visible:border-[color-mix(in_oklab,var(--accent)_75%,var(--foreground))] focus-visible:ring-[color-mix(in_oklab,var(--accent)_22%,transparent)]",
              className
            )}
            {...props}
          />
          <label
            htmlFor={fieldId}
            className={cn(
              "pointer-events-none absolute left-2.5 origin-[0_50%] text-muted-foreground transition-all duration-200 ease-out",
              "top-1/2 -translate-y-1/2 text-[15px]",
              "peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-[11px] peer-focus:font-medium peer-focus:text-[color-mix(in_oklab,var(--accent)_82%,var(--foreground))]",
              "peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium peer-[:not(:placeholder-shown)]:text-foreground/75"
            )}
          >
            {label}
          </label>
        </div>
        {hint ? (
          <p className="text-xs text-muted-foreground pl-0.5">{hint}</p>
        ) : null}
      </div>
    );
  }
);

FloatingField.displayName = "FloatingField";
