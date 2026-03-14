import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordInputProps {
  id?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  showStrength?: boolean;
  className?: string;
}

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "Uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "Number", test: (p: string) => /\d/.test(p) },
  { label: "Special character (!@#$...)", test: (p: string) => /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`]/.test(p) },
];

function getStrength(password: string) {
  const passed = PASSWORD_RULES.filter((r) => r.test(password)).length;
  if (passed <= 1) return { level: "weak", color: "bg-destructive", percent: 20, label: "Weak" };
  if (passed <= 2) return { level: "fair", color: "bg-orange-500", percent: 40, label: "Fair" };
  if (passed <= 3) return { level: "good", color: "bg-yellow-500", percent: 60, label: "Good" };
  if (passed <= 4) return { level: "strong", color: "bg-primary", percent: 80, label: "Strong" };
  return { level: "excellent", color: "bg-green-600", percent: 100, label: "Excellent" };
}

export function PasswordInput({
  id,
  value,
  onChange,
  placeholder = "••••••••",
  required,
  autoComplete,
  showStrength = false,
  className,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  const strength = useMemo(() => getStrength(value), [value]);
  const ruleResults = useMemo(
    () => PASSWORD_RULES.map((r) => ({ ...r, passed: r.test(value) })),
    [value]
  );

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          autoComplete={autoComplete}
          className={cn("pr-10", className)}
          minLength={8}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-foreground"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>

      {showStrength && value.length > 0 && (
        <div className="space-y-2">
          {/* Strength bar */}
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-300", strength.color)}
                style={{ width: `${strength.percent}%` }}
              />
            </div>
            <span className={cn("text-xs font-medium", {
              "text-destructive": strength.level === "weak",
              "text-orange-500": strength.level === "fair",
              "text-yellow-600": strength.level === "good",
              "text-primary": strength.level === "strong",
              "text-green-600": strength.level === "excellent",
            })}>
              {strength.label}
            </span>
          </div>

          {/* Rule checklist */}
          <ul className="grid grid-cols-2 gap-x-2 gap-y-0.5">
            {ruleResults.map((r) => (
              <li key={r.label} className="flex items-center gap-1 text-xs">
                {r.passed ? (
                  <Check className="h-3 w-3 text-green-600 shrink-0" />
                ) : (
                  <X className="h-3 w-3 text-muted-foreground shrink-0" />
                )}
                <span className={r.passed ? "text-green-600" : "text-muted-foreground"}>
                  {r.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Validate password meets all strength requirements */
export function isStrongPassword(password: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(password));
}
