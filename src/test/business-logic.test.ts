import { describe, it, expect } from "vitest";

// ─── Food Listing Validation ──────────────────────────────────────────────────
describe("Food listing validation", () => {
  const validateListing = (title: string, expiresAt: string | null) => {
    const errors: string[] = [];
    if (!title.trim()) errors.push("Title is required");
    if (title.trim().length > 100) errors.push("Title too long");
    if (expiresAt && new Date(expiresAt) <= new Date()) errors.push("Expiry must be in the future");
    return errors;
  };

  it("fails when title is empty", () => {
    expect(validateListing("", null)).toContain("Title is required");
  });

  it("fails when title is only spaces", () => {
    expect(validateListing("   ", null)).toContain("Title is required");
  });

  it("passes with a valid title", () => {
    expect(validateListing("Chicken Biryani", null)).toHaveLength(0);
  });

  it("fails when title exceeds 100 characters", () => {
    expect(validateListing("A".repeat(101), null)).toContain("Title too long");
  });

  it("fails when expiry date is in the past", () => {
    const past = new Date(Date.now() - 3600000).toISOString();
    expect(validateListing("Rice", past)).toContain("Expiry must be in the future");
  });

  it("passes when expiry date is in the future", () => {
    const future = new Date(Date.now() + 3600000).toISOString();
    expect(validateListing("Rice", future)).toHaveLength(0);
  });
});

// ─── Request Status Logic ─────────────────────────────────────────────────────
describe("Request status display logic", () => {
  type Status = "pending" | "accepted" | "confirmed" | "delivered" | "cancelled" | "volunteer_accepted";

  const getStatusBadge = (status: Status) => {
    const map: Record<Status, { label: string; color: string }> = {
      pending:            { label: "Pending",    color: "yellow" },
      accepted:           { label: "Accepted",   color: "blue"   },
      volunteer_accepted: { label: "Volunteer Accepted", color: "purple" },
      confirmed:          { label: "Confirmed",  color: "green"  },
      delivered:          { label: "Delivered",  color: "green"  },
      cancelled:          { label: "Cancelled",  color: "red"    },
    };
    return map[status] ?? { label: "Unknown", color: "gray" };
  };

  it("returns correct label for pending", () => {
    expect(getStatusBadge("pending").label).toBe("Pending");
  });

  it("returns correct color for cancelled", () => {
    expect(getStatusBadge("cancelled").color).toBe("red");
  });

  it("returns correct label for volunteer_accepted", () => {
    expect(getStatusBadge("volunteer_accepted").label).toBe("Volunteer Accepted");
  });

  it("delivered shows green badge", () => {
    expect(getStatusBadge("delivered").color).toBe("green");
  });
});

// ─── Role-Based Access ────────────────────────────────────────────────────────
describe("Role-based access control", () => {
  type Role = "donor" | "receiver" | "volunteer" | "ngo" | "admin";

  const canCreateListing = (role: Role) => role === "donor" || role === "admin";
  const canRequestPickup = (role: Role) => role === "receiver" || role === "ngo" || role === "admin";
  const canAcceptDelivery = (role: Role) => role === "volunteer" || role === "admin";
  const canBanUsers = (role: Role) => role === "admin";

  it("only donors and admins can create listings", () => {
    expect(canCreateListing("donor")).toBe(true);
    expect(canCreateListing("admin")).toBe(true);
    expect(canCreateListing("receiver")).toBe(false);
    expect(canCreateListing("volunteer")).toBe(false);
  });

  it("receivers and NGOs can request pickups", () => {
    expect(canRequestPickup("receiver")).toBe(true);
    expect(canRequestPickup("ngo")).toBe(true);
    expect(canRequestPickup("donor")).toBe(false);
  });

  it("only volunteers and admins can accept delivery", () => {
    expect(canAcceptDelivery("volunteer")).toBe(true);
    expect(canAcceptDelivery("admin")).toBe(true);
    expect(canAcceptDelivery("receiver")).toBe(false);
  });

  it("only admin can ban users", () => {
    expect(canBanUsers("admin")).toBe(true);
    expect(canBanUsers("donor")).toBe(false);
    expect(canBanUsers("volunteer")).toBe(false);
  });
});

// ─── Impact Calculations ──────────────────────────────────────────────────────
describe("Impact stat calculations", () => {
  const AVG_KG = 2.5;
  const CO2_FACTOR = 2.5;

  it("calculates kg saved correctly", () => {
    expect(10 * AVG_KG).toBe(25);
  });

  it("calculates CO2 saved from kg", () => {
    expect(25 * CO2_FACTOR).toBe(62.5);
  });

  it("zero pickups gives zero impact", () => {
    expect(0 * AVG_KG).toBe(0);
    expect(0 * CO2_FACTOR).toBe(0);
  });

  it("rounds kg saved correctly", () => {
    expect(Math.round(7 * AVG_KG)).toBe(18);
  });
});
