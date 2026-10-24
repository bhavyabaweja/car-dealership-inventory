import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "./Toasts";

function Buttons() {
  const toast = useToast();
  return (
    <>
      <button onClick={() => toast.success("Purchased Toyota Camry")}>buy</button>
      <button onClick={() => toast.error("Only 0 left in stock")}>fail</button>
    </>
  );
}

function setup() {
  render(
    <ToastProvider>
      <Buttons />
    </ToastProvider>,
  );
  // fireEvent, not user-event: with a fake clock, Testing Library's async helpers wait on a real timer that never fires.
}

describe("toasts", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a message in a labelled live region, so screen readers announce it", () => {
    setup();

    fireEvent.click(screen.getByRole("button", { name: "buy" }));

    const region = screen.getByRole("region", { name: "Notifications" });
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toHaveTextContent("Purchased Toyota Camry");
  });

  it("removes a success message by itself after a few seconds", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "buy" }));

    act(() => void vi.advanceTimersByTime(3_900));
    expect(screen.getByText("Purchased Toyota Camry")).toBeInTheDocument();

    act(() => void vi.advanceTimersByTime(200));
    expect(screen.queryByText("Purchased Toyota Camry")).not.toBeInTheDocument();
  });

  it("leaves an error up longer than a success, and announces it as an alert", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "fail" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Only 0 left in stock");

    act(() => void vi.advanceTimersByTime(4_100));
    expect(screen.getByText("Only 0 left in stock")).toBeInTheDocument();

    act(() => void vi.advanceTimersByTime(2_000));
    expect(screen.queryByText("Only 0 left in stock")).not.toBeInTheDocument();
  });

  it("can be dismissed by hand", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "buy" }));

    fireEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));

    expect(screen.queryByText("Purchased Toyota Camry")).not.toBeInTheDocument();
  });

  it("stacks several messages, each going away on its own schedule", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "buy" }));
    act(() => void vi.advanceTimersByTime(2_000));
    fireEvent.click(screen.getByRole("button", { name: "fail" }));

    expect(screen.getByText("Purchased Toyota Camry")).toBeInTheDocument();
    expect(screen.getByText("Only 0 left in stock")).toBeInTheDocument();

    act(() => void vi.advanceTimersByTime(2_100)); // the first is now 4.1s old; the second only 2.1s
    expect(screen.queryByText("Purchased Toyota Camry")).not.toBeInTheDocument();
    expect(screen.getByText("Only 0 left in stock")).toBeInTheDocument();
  });

  it("explains itself when used outside a ToastProvider", () => {
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderHook(() => useToast())).toThrow(/ToastProvider/);

    quiet.mockRestore();
  });
});
