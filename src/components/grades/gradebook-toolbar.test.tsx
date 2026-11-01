import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GradebookToolbar } from "@/components/grades/gradebook-toolbar";

function mount(overrides: Partial<Parameters<typeof GradebookToolbar>[0]> = {}) {
  const props = {
    query: "",
    onQueryChange: vi.fn(),
    sortBy: "name" as const,
    onSortChange: vi.fn(),
    onlyPending: false,
    onTogglePending: vi.fn(),
    onlyAtRisk: false,
    onToggleAtRisk: vi.fn(),
    markView: "points" as const,
    onMarkViewChange: vi.fn(),
    phoneView: "cards" as const,
    onPhoneViewChange: vi.fn(),
    passMark: 70,
    ...overrides,
  };
  render(<GradebookToolbar {...props} />);
  return props;
}

describe("GradebookToolbar — phone view switch", () => {
  it("offers Tarjetas / Tabla as a radiogroup below desktop", () => {
    mount();
    const group = screen.getByRole("radiogroup", { name: "Vista de teléfono" });
    expect(group).toBeInTheDocument();
    // From `lg` up the matrix is the only view, so the switch is hidden there.
    expect(group.className).toContain("lg:hidden");
    expect(screen.getByRole("radio", { name: "Tarjetas" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "Tabla" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("disables Tarjetas on a landscape phone, where only the matrix applies", () => {
    mount({ cardsDisabled: true });
    expect(screen.getByRole("radio", { name: "Tarjetas" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "Tabla" })).toBeEnabled();
  });

  it("switches the view from the radiogroup", async () => {
    const props = mount();
    await userEvent.click(screen.getByRole("radio", { name: "Tabla" }));
    expect(props.onPhoneViewChange).toHaveBeenCalledWith("grid");
  });

  it("keeps the switch plain — no glyphs beside the labels", () => {
    mount();
    expect(
      screen.getByRole("radiogroup", { name: "Vista de teléfono" }).querySelector("svg"),
    ).toBeNull();
  });

  it("shows Tabla as selected while the rotate hint is on screen", () => {
    mount({ phoneView: "grid" });
    expect(screen.getByRole("radio", { name: "Tabla" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });
});
