import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ShortcutBadge } from "@/components/keyboard/shortcut-badge";

describe("ShortcutBadge", () => {
  it("renders keys as kbd elements", () => {
    render(<ShortcutBadge keys={["Ctrl", "S"]} />);

    const kbdElements = screen.getAllByText(/Ctrl|S/);
    kbdElements.forEach((el) => {
      expect(el.tagName).toBe("KBD");
    });
  });

  it("renders the correct number of keys", () => {
    const { container } = render(<ShortcutBadge keys={["Ctrl", "Shift", "P"]} />);

    const kbdElements = container.querySelectorAll("kbd");
    expect(kbdElements).toHaveLength(3);
  });

  it("displays the correct text for each key", () => {
    render(<ShortcutBadge keys={["Ctrl", "Shift", "P"]} />);

    expect(screen.getByText("Ctrl")).toBeInTheDocument();
    expect(screen.getByText("Shift")).toBeInTheDocument();
    expect(screen.getByText("P")).toBeInTheDocument();
  });

  it("renders a single key", () => {
    const { container } = render(<ShortcutBadge keys={["Enter"]} />);

    const kbdElements = container.querySelectorAll("kbd");
    expect(kbdElements).toHaveLength(1);
    expect(screen.getByText("Enter")).toBeInTheDocument();
  });

  it("renders an empty state when no keys are provided", () => {
    const { container } = render(<ShortcutBadge keys={[]} />);

    const kbdElements = container.querySelectorAll("kbd");
    expect(kbdElements).toHaveLength(0);
  });

  it("wraps all kbd elements in a span container", () => {
    const { container } = render(<ShortcutBadge keys={["Ctrl", "K"]} />);

    const wrapper = container.firstElementChild;
    expect(wrapper?.tagName).toBe("SPAN");
    expect(wrapper?.querySelectorAll("kbd")).toHaveLength(2);
  });

  it("renders special character keys correctly", () => {
    render(<ShortcutBadge keys={["\u2318", "\u21E7", "K"]} />);

    expect(screen.getByText("\u2318")).toBeInTheDocument();
    expect(screen.getByText("\u21E7")).toBeInTheDocument();
    expect(screen.getByText("K")).toBeInTheDocument();
  });
});
