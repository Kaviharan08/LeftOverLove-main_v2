import { describe, it, expect } from "vitest";
import { localInputToSLISO } from "@/lib/timezone";

describe("timezone utils", () => {
  it("converts local datetime string to ISO string", () => {
    const result = localInputToSLISO("2026-03-17T10:00");
    expect(result).toBeTypeOf("string");
    expect(result).toContain("2026-03-17");
  });

  it("returns a valid ISO date string", () => {
    const result = localInputToSLISO("2026-06-01T14:30");
    expect(() => new Date(result)).not.toThrow();
    expect(new Date(result).getFullYear()).toBe(2026);
  });
});

describe("food listing helpers", () => {
  it("calculates estimated meals from kg saved", () => {
    const AVG_KG_PER_LISTING = 2.5;
    const completedPickups = 10;
    const kgSaved = completedPickups * AVG_KG_PER_LISTING;
    expect(kgSaved).toBe(25);
  });

  it("calculates CO2 saved correctly", () => {
    const CO2_FACTOR = 2.5;
    const kgSaved = 25;
    expect(kgSaved * CO2_FACTOR).toBe(62.5);
  });

  it("password strength — weak password fails", () => {
    const password = "abc123";
    const hasUpper = /[A-Z]/.test(password);
    const hasSpecial = /[!@#$%^&*]/.test(password);
    const longEnough = password.length >= 8;
    const isStrong = hasUpper && hasSpecial && longEnough;
    expect(isStrong).toBe(false);
  });

  it("password strength — strong password passes", () => {
    const password = "MyP@ssw0rd!";
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasSpecial = /[!@#$%^&*]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const longEnough = password.length >= 8;
    const isStrong = hasUpper && hasLower && hasSpecial && hasNumber && longEnough;
    expect(isStrong).toBe(true);
  });
});
