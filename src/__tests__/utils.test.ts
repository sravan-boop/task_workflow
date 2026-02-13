import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn() utility function", () => {
  it("merges multiple class strings", () => {
    const result = cn("px-4", "py-2", "text-sm");
    expect(result).toBe("px-4 py-2 text-sm");
  });

  it("handles a single class string", () => {
    const result = cn("px-4");
    expect(result).toBe("px-4");
  });

  it("handles conditional classes using objects", () => {
    const isActive = true;
    const isDisabled = false;
    const result = cn("base", { "bg-blue-500": isActive, "opacity-50": isDisabled });
    expect(result).toBe("base bg-blue-500");
  });

  it("handles conditional classes that are all false", () => {
    const result = cn("base", { "bg-blue-500": false, "opacity-50": false });
    expect(result).toBe("base");
  });

  it("handles undefined values gracefully", () => {
    const result = cn("px-4", undefined, "py-2");
    expect(result).toBe("px-4 py-2");
  });

  it("handles null values gracefully", () => {
    const result = cn("px-4", null, "py-2");
    expect(result).toBe("px-4 py-2");
  });

  it("handles false and empty string values gracefully", () => {
    const result = cn("px-4", false, "", "py-2");
    expect(result).toBe("px-4 py-2");
  });

  it("resolves Tailwind padding conflicts (last wins)", () => {
    const result = cn("px-4", "px-6");
    expect(result).toBe("px-6");
  });

  it("resolves Tailwind color conflicts (last wins)", () => {
    const result = cn("text-red-500", "text-blue-500");
    expect(result).toBe("text-blue-500");
  });

  it("resolves Tailwind background conflicts (last wins)", () => {
    const result = cn("bg-red-500", "bg-green-500");
    expect(result).toBe("bg-green-500");
  });

  it("does not merge non-conflicting Tailwind classes", () => {
    const result = cn("px-4", "py-2", "text-sm", "bg-white");
    expect(result).toBe("px-4 py-2 text-sm bg-white");
  });

  it("handles arrays of classes", () => {
    const result = cn(["px-4", "py-2"], "text-sm");
    expect(result).toBe("px-4 py-2 text-sm");
  });

  it("returns empty string when no arguments provided", () => {
    const result = cn();
    expect(result).toBe("");
  });

  it("resolves conflicting margin classes", () => {
    const result = cn("mt-2", "mt-4");
    expect(result).toBe("mt-4");
  });
});
