import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "@/components/ui/error-boundary";

// Suppress console.error for expected errors in tests
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
  return () => {
    console.error = originalConsoleError;
  };
});

function GoodChild() {
  return <div>Everything is fine</div>;
}

function ThrowingChild({ message = "Test error" }: { message?: string }): React.JSX.Element {
  throw new Error(message);
}

describe("ErrorBoundary", () => {
  it("renders children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <GoodChild />
      </ErrorBoundary>
    );

    expect(screen.getByText("Everything is fine")).toBeInTheDocument();
  });

  it("renders multiple children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <div>Child 1</div>
        <div>Child 2</div>
      </ErrorBoundary>
    );

    expect(screen.getByText("Child 1")).toBeInTheDocument();
    expect(screen.getByText("Child 2")).toBeInTheDocument();
  });

  it("renders error UI when a child throws", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Test error")).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("displays the specific error message from the thrown error", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild message="Custom error message" />
      </ErrorBoundary>
    );

    expect(screen.getByText("Custom error message")).toBeInTheDocument();
  });

  it("renders custom fallback when provided and error occurs", () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback UI</div>}>
        <ThrowingChild />
      </ErrorBoundary>
    );

    expect(screen.getByText("Custom fallback UI")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });

  it("resets error state and re-renders children when Try again is clicked", () => {
    let shouldThrow = true;

    function ConditionalThrow() {
      if (shouldThrow) {
        throw new Error("Conditional error");
      }
      return <div>Recovered successfully</div>;
    }

    render(
      <ErrorBoundary>
        <ConditionalThrow />
      </ErrorBoundary>
    );

    // Error UI should be shown
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Conditional error")).toBeInTheDocument();

    // Fix the condition before clicking reset
    shouldThrow = false;

    // Click the Try again button
    fireEvent.click(screen.getByText("Try again"));

    // Children should now render successfully
    expect(screen.getByText("Recovered successfully")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });

  it("shows the Try again button in the default error UI", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    );

    const tryAgainButton = screen.getByText("Try again");
    expect(tryAgainButton).toBeInTheDocument();
    expect(tryAgainButton.closest("button")).toBeInTheDocument();
  });
});
