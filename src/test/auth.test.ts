import { describe, it, expect } from "vitest";

// Mirrors the isStrongPassword function from PasswordInput.tsx
const isStrongPassword = (password: string) => {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[!@#$%^&*(),.?":{}|<>]/.test(password)
  );
};

describe("Password validation", () => {
  it("fails for password under 8 characters", () => {
    expect(isStrongPassword("Ab1!")).toBe(false);
  });

  it("fails for missing uppercase", () => {
    expect(isStrongPassword("mypassword1!")).toBe(false);
  });

  it("fails for missing lowercase", () => {
    expect(isStrongPassword("MYPASSWORD1!")).toBe(false);
  });

  it("fails for missing number", () => {
    expect(isStrongPassword("MyPassword!")).toBe(false);
  });

  it("fails for missing special character", () => {
    expect(isStrongPassword("MyPassword1")).toBe(false);
  });

  it("passes for a strong password", () => {
    expect(isStrongPassword("MyP@ssw0rd!")).toBe(true);
  });

  it("passes for another valid strong password", () => {
    expect(isStrongPassword("Himas@2026!")).toBe(true);
  });
});

// ─── Email validation ─────────────────────────────────────────────────────────
describe("Email validation", () => {
  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  it("accepts valid email", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
  });

  it("accepts student email", () => {
    expect(isValidEmail("amhimas@students.nsbm.ac.lk")).toBe(true);
  });

  it("rejects email without @", () => {
    expect(isValidEmail("userexample.com")).toBe(false);
  });

  it("rejects email without domain", () => {
    expect(isValidEmail("user@")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidEmail("")).toBe(false);
  });
});

// ─── Role validation ──────────────────────────────────────────────────────────
describe("User role validation", () => {
  type AppRole = "donor" | "receiver" | "volunteer" | "ngo" | "admin";
  const VALID_ROLES: AppRole[] = ["donor", "receiver", "volunteer", "ngo", "admin"];

  const isValidRole = (role: string): role is AppRole =>
    VALID_ROLES.includes(role as AppRole);

  it("accepts valid roles", () => {
    expect(isValidRole("donor")).toBe(true);
    expect(isValidRole("receiver")).toBe(true);
    expect(isValidRole("volunteer")).toBe(true);
    expect(isValidRole("ngo")).toBe(true);
    expect(isValidRole("admin")).toBe(true);
  });

  it("rejects invalid role", () => {
    expect(isValidRole("superuser")).toBe(false);
    expect(isValidRole("")).toBe(false);
    expect(isValidRole("DONOR")).toBe(false);
  });
});

// ─── Route guard logic ────────────────────────────────────────────────────────
describe("Dashboard route guard", () => {
  const getDashboardRoute = (role: string | null) => {
    if (!role) return "/login";
    const routes: Record<string, string> = {
      donor: "/dashboard/donor",
      receiver: "/dashboard/receiver",
      volunteer: "/dashboard/volunteer",
      ngo: "/dashboard/ngo",
      admin: "/dashboard/admin",
    };
    return routes[role] ?? "/login";
  };

  it("redirects to login when no role", () => {
    expect(getDashboardRoute(null)).toBe("/login");
  });

  it("routes donor to donor dashboard", () => {
    expect(getDashboardRoute("donor")).toBe("/dashboard/donor");
  });

  it("routes admin to admin dashboard", () => {
    expect(getDashboardRoute("admin")).toBe("/dashboard/admin");
  });

  it("routes unknown role to login", () => {
    expect(getDashboardRoute("unknown")).toBe("/login");
  });
});
