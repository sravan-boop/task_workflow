import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock trpc hooks
const mockCreateMutate = vi.fn();
const mockUpdateMutate = vi.fn();
vi.mock("@/lib/trpc", () => ({
  trpc: {
    workspaces: {
      list: {
        useQuery: () => ({
          data: [{ id: "workspace-1", name: "Test Workspace" }],
        }),
      },
      update: {
        useMutation: () => ({
          mutate: (input: Record<string, string>, opts?: { onSuccess?: () => void }) => {
            mockUpdateMutate(input);
            opts?.onSuccess?.();
          },
          isPending: false,
        }),
      },
    },
    projects: {
      create: {
        useMutation: (opts?: { onSuccess?: (project: { id: string }) => void }) => ({
          mutate: (input: { name: string; workspaceId: string }) => {
            mockCreateMutate(input);
            opts?.onSuccess?.({ id: "new-project-1" });
          },
          isPending: false,
        }),
      },
    },
  },
}));

// Mock lucide-react icons to simple elements
vi.mock("lucide-react", () => ({
  CheckCircle2: (props: Record<string, unknown>) => <svg data-testid="check-circle-icon" {...props} />,
  ArrowRight: (props: Record<string, unknown>) => <svg data-testid="arrow-right-icon" {...props} />,
  Sparkles: (props: Record<string, unknown>) => <svg data-testid="sparkles-icon" {...props} />,
  Users: (props: Record<string, unknown>) => <svg data-testid="users-icon" {...props} />,
  FolderKanban: (props: Record<string, unknown>) => <svg data-testid="folder-kanban-icon" {...props} />,
  Zap: (props: Record<string, unknown>) => <svg data-testid="zap-icon" {...props} />,
}));

import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("OnboardingWizard", () => {
  it("renders the welcome step initially", () => {
    const onComplete = vi.fn();
    render(<OnboardingWizard onComplete={onComplete} />);

    expect(screen.getByText("Welcome to TaskFlow AI")).toBeInTheDocument();
    expect(
      screen.getByText("Let's set up your workspace in a few quick steps.")
    ).toBeInTheDocument();
  });

  it("shows Continue button on the first step", () => {
    const onComplete = vi.fn();
    render(<OnboardingWizard onComplete={onComplete} />);

    expect(screen.getByText("Continue")).toBeInTheDocument();
  });

  it("shows Skip for now button", () => {
    const onComplete = vi.fn();
    render(<OnboardingWizard onComplete={onComplete} />);

    expect(screen.getByText("Skip for now")).toBeInTheDocument();
  });

  it("advances to the workspace step when Continue is clicked", () => {
    const onComplete = vi.fn();
    render(<OnboardingWizard onComplete={onComplete} />);

    fireEvent.click(screen.getByText("Continue"));

    expect(screen.getByText("Name your workspace")).toBeInTheDocument();
    expect(
      screen.getByText("This is where your team will collaborate.")
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g., Acme Corp")).toBeInTheDocument();
  });

  it("advances to the project step when Continue is clicked twice", () => {
    const onComplete = vi.fn();
    render(<OnboardingWizard onComplete={onComplete} />);

    fireEvent.click(screen.getByText("Continue"));
    fireEvent.click(screen.getByText("Continue"));

    expect(screen.getByText("Create your first project")).toBeInTheDocument();
    expect(
      screen.getByText("Start organizing your work right away.")
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("e.g., Website Redesign")
    ).toBeInTheDocument();
  });

  it("advances to the ready step after project step", () => {
    const onComplete = vi.fn();
    render(<OnboardingWizard onComplete={onComplete} />);

    // Advance through welcome -> workspace -> project -> ready
    fireEvent.click(screen.getByText("Continue"));
    fireEvent.click(screen.getByText("Continue"));
    fireEvent.click(screen.getByText("Continue"));

    expect(screen.getByText("You're all set!")).toBeInTheDocument();
    expect(screen.getByText("Go to dashboard")).toBeInTheDocument();
  });

  it("calls onComplete and navigates to /home when Skip is clicked", () => {
    const onComplete = vi.fn();
    render(<OnboardingWizard onComplete={onComplete} />);

    fireEvent.click(screen.getByText("Skip for now"));

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/home");
  });

  it("renders the welcome step with status messages", () => {
    const onComplete = vi.fn();
    render(<OnboardingWizard onComplete={onComplete} />);

    expect(screen.getByText("Account created successfully")).toBeInTheDocument();
    expect(screen.getByText("Default workspace ready")).toBeInTheDocument();
    expect(screen.getByText("AI features enabled")).toBeInTheDocument();
  });

  it("renders progress indicators for all 4 steps", () => {
    const onComplete = vi.fn();
    const { container } = render(<OnboardingWizard onComplete={onComplete} />);

    // There should be 4 progress bar segments
    const progressBars = container.querySelectorAll(".rounded-full.h-1");
    expect(progressBars).toHaveLength(4);
  });

  it("calls onComplete and navigates to /home when Go to dashboard is clicked without project", () => {
    const onComplete = vi.fn();
    render(<OnboardingWizard onComplete={onComplete} />);

    // Advance through all steps without creating a project
    fireEvent.click(screen.getByText("Continue"));
    fireEvent.click(screen.getByText("Continue"));
    fireEvent.click(screen.getByText("Continue"));

    // Click Go to dashboard on the ready step
    fireEvent.click(screen.getByText("Go to dashboard"));

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/home");
  });

  it("creates a project and navigates to it when name is provided", () => {
    const onComplete = vi.fn();
    render(<OnboardingWizard onComplete={onComplete} />);

    // Advance to project step
    fireEvent.click(screen.getByText("Continue"));
    fireEvent.click(screen.getByText("Continue"));

    // Enter a project name
    const input = screen.getByPlaceholderText("e.g., Website Redesign");
    fireEvent.change(input, { target: { value: "My New Project" } });

    // Click Continue on project step - creates project and advances
    fireEvent.click(screen.getByText("Continue"));

    expect(mockCreateMutate).toHaveBeenCalledWith({
      name: "My New Project",
      workspaceId: "workspace-1",
    });

    // Now on ready step, click Go to dashboard
    fireEvent.click(screen.getByText("Go to dashboard"));

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/projects/new-project-1");
  });

  it("updates workspace name when provided", () => {
    const onComplete = vi.fn();
    render(<OnboardingWizard onComplete={onComplete} />);

    // Advance to workspace step
    fireEvent.click(screen.getByText("Continue"));

    // Enter workspace name
    const input = screen.getByPlaceholderText("e.g., Acme Corp");
    fireEvent.change(input, { target: { value: "My Team" } });

    // Click Continue
    fireEvent.click(screen.getByText("Continue"));

    expect(mockUpdateMutate).toHaveBeenCalledWith(
      { id: "workspace-1", name: "My Team" }
    );
  });
});
