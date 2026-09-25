import { cn } from "@/lib/utils";
import {
  cleanGuardianDisplayName,
  formatGuardianContextLine,
} from "@/lib/messages/chat-display";

type GuardianChatIdentityProps = {
  name: string;
  classLabel?: string | null;
  studentName?: string | null;
  /** Role shown before the class line in the new-chat picker. */
  roleLabel?: string | null;
  /** `list` = sidebar row; `header` = thread top; `picker` = modal row. */
  variant?: "list" | "header" | "picker";
  className?: string;
};

/** Guardian name + one gray subtitle: "1B · Rodrigo Acosta". */
export function GuardianChatIdentity({
  name,
  classLabel,
  studentName,
  roleLabel,
  variant = "list",
  className,
}: GuardianChatIdentityProps) {
  const displayName = cleanGuardianDisplayName(name);
  const contextLine = formatGuardianContextLine(classLabel, studentName);
  const subtitle = [roleLabel?.trim(), contextLine].filter(Boolean).join(" · ");

  return (
    <span className={cn("min-w-0", className)}>
      <span
        className={cn(
          "block truncate",
          variant === "header"
            ? "text-sm font-bold text-foreground"
            : "text-sm font-semibold text-foreground/85",
        )}
      >
        {displayName}
      </span>
      {subtitle ? (
        <span className="mt-0.5 block truncate text-[11px] font-medium text-foreground/45">
          {subtitle}
        </span>
      ) : null}
    </span>
  );
}
