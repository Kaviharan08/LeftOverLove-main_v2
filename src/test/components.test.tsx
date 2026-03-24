import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonCard, SkeletonGrid, SkeletonStatCards } from "@/components/SkeletonCard";

// ─── EmptyState ───────────────────────────────────────────────────────────────
describe("EmptyState component", () => {
  it("renders icon, title and description", () => {
    render(
      <MemoryRouter>
        <EmptyState icon="🍽️" title="No food available" description="Check back later" />
      </MemoryRouter>
    );
    expect(screen.getByText("No food available")).toBeInTheDocument();
    expect(screen.getByText("Check back later")).toBeInTheDocument();
    expect(screen.getByText("🍽️")).toBeInTheDocument();
  });

  it("renders action link when action prop is provided", () => {
    render(
      <MemoryRouter>
        <EmptyState
          icon="📦"
          title="No listings"
          description="Create your first listing"
          action={{ label: "Create Listing", to: "/food/create" }}
        />
      </MemoryRouter>
    );
    expect(screen.getByRole("link", { name: /create listing/i })).toBeInTheDocument();
  });

  it("does not render action link when action prop is not provided", () => {
    render(
      <MemoryRouter>
        <EmptyState icon="📦" title="Empty" description="Nothing here" />
      </MemoryRouter>
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});

// ─── SkeletonCard ─────────────────────────────────────────────────────────────
describe("SkeletonCard component", () => {
  it("renders without crashing", () => {
    const { container } = render(<SkeletonCard />);
    expect(container.firstChild).not.toBeNull();
  });

  it("SkeletonGrid renders the correct number of skeleton cards", () => {
    const { container } = render(<SkeletonGrid count={4} />);
    const cards = container.querySelectorAll(".rounded-xl");
    expect(cards.length).toBe(4);
  });

  it("SkeletonGrid defaults to 6 cards", () => {
    const { container } = render(<SkeletonGrid />);
    const cards = container.querySelectorAll(".rounded-xl");
    expect(cards.length).toBe(6);
  });

  it("SkeletonStatCards renders correct number of stat cards", () => {
    const { container } = render(<SkeletonStatCards count={3} />);
    const cards = container.querySelectorAll(".rounded-xl");
    expect(cards.length).toBe(3);
  });
});
