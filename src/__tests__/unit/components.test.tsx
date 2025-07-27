import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { StatCard } from "@/components/StatCard";

describe("StatCard", () => {
  it("should render title and value", () => {
    render(<StatCard title="Total Injections" value="42" />);

    expect(screen.getByText("Total Injections")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("should render description when provided", () => {
    render(<StatCard title="Compliance Rate" value="85%" description="Last 30 days" />);

    expect(screen.getByText("Compliance Rate")).toBeInTheDocument();
    expect(screen.getByText("85%")).toBeInTheDocument();
    expect(screen.getByText("Last 30 days")).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    const { container } = render(<StatCard title="Test" value="123" className="custom-class" />);

    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("should handle color variants", () => {
    const { container } = render(<StatCard title="Test" value="123" color="green" />);

    // Check if color-specific classes are applied
    expect(container.querySelector(".text-green-600")).toBeInTheDocument();
  });
});

describe("LoadingSpinner", () => {
  it("should render with default size", () => {
    render(<LoadingSpinner />);

    const spinner = screen.getByRole("status");
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass("h-8", "w-8");
  });

  it("should render with custom size", () => {
    render(<LoadingSpinner size="lg" />);

    const spinner = screen.getByRole("status");
    expect(spinner).toHaveClass("h-12", "w-12");
  });

  it("should render with custom text", () => {
    render(<LoadingSpinner text="Processing..." />);

    expect(screen.getByText("Processing...")).toBeInTheDocument();
  });

  it("should be accessible with proper aria labels", () => {
    render(<LoadingSpinner />);

    const spinner = screen.getByRole("status");
    expect(spinner).toHaveAttribute("aria-label", "Loading");
  });
});

describe("ErrorMessage", () => {
  it("should render error message", () => {
    render(<ErrorMessage message="Something went wrong" />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("should render error object message", () => {
    const error = new Error("Network error");
    render(<ErrorMessage error={error} />);

    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  it("should handle retry functionality", () => {
    const mockRetry = vi.fn();
    render(<ErrorMessage message="Failed to load" onRetry={mockRetry} />);

    const retryButton = screen.getByText("Try Again");
    fireEvent.click(retryButton);

    expect(mockRetry).toHaveBeenCalledOnce();
  });

  it("should not show retry button when onRetry is not provided", () => {
    render(<ErrorMessage message="Error without retry" />);

    expect(screen.queryByText("Try Again")).not.toBeInTheDocument();
  });

  it("should have proper error styling", () => {
    const { container } = render(<ErrorMessage message="Error" />);

    expect(container.firstChild).toHaveClass("text-red-600");
  });

  it("should be accessible with proper role", () => {
    render(<ErrorMessage message="Error message" />);

    const errorElement = screen.getByRole("alert");
    expect(errorElement).toBeInTheDocument();
  });
});
