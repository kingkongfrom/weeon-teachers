import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SelectMenu } from "@/components/ui/select-menu";

const options = [
  { value: "", label: "Cualquiera" },
  { value: "homework", label: "Tareas" },
  { value: "exam", label: "Exámenes" },
];

function mount(props: Partial<Parameters<typeof SelectMenu>[0]> = {}) {
  const onChange = vi.fn();
  render(
    <SelectMenu
      value=""
      onChange={onChange}
      variant="chip"
      label="Tipo de columna del rubro"
      className="w-[7rem] shrink-0"
      options={options}
      {...props}
    />,
  );
  return { onChange };
}

describe("SelectMenu", () => {
  it("opens a listbox with every option", async () => {
    mount();
    await userEvent.click(screen.getByRole("button", { name: "Tipo de columna del rubro" }));
    expect(
      screen.getByRole("listbox", { name: "Tipo de columna del rubro" }),
    ).toBeTruthy();
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("selects an option and closes", async () => {
    const { onChange } = mount();
    await userEvent.click(screen.getByRole("button", { name: "Tipo de columna del rubro" }));
    await userEvent.click(screen.getByRole("option", { name: /Exámenes/ }));
    expect(onChange).toHaveBeenCalledWith("exam");
    await waitFor(() =>
      expect(
        screen.queryByRole("listbox", { name: "Tipo de columna del rubro" }),
      ).toBeNull(),
    );
  });

  it("closes on an outside click", async () => {
    mount();
    await userEvent.click(screen.getByRole("button", { name: "Tipo de columna del rubro" }));
    await screen.findByRole("listbox");
    await userEvent.click(document.body);
    await waitFor(() =>
      expect(
        screen.queryByRole("listbox", { name: "Tipo de columna del rubro" }),
      ).toBeNull(),
    );
  });

  it("closes on Escape", async () => {
    mount();
    await userEvent.click(screen.getByRole("button", { name: "Tipo de columna del rubro" }));
    await screen.findByRole("listbox");
    await userEvent.type(
      screen.getByRole("button", { name: "Tipo de columna del rubro" }),
      "{Escape}",
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("listbox", { name: "Tipo de columna del rubro" }),
      ).toBeNull(),
    );
  });
});
