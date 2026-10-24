import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebouncedValue } from "./useDebouncedValue";

describe("useDebouncedValue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("has the value straight away on first use, so nothing waits to start", () => {
    const { result } = renderHook(() => useDebouncedValue("toy", 300));

    expect(result.current).toBe("toy");
  });

  it("keeps the old value until the new one has stood still for the delay", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), { initialProps: { value: "a" } });

    rerender({ value: "b" });
    act(() => void vi.advanceTimersByTime(299));
    expect(result.current).toBe("a");

    act(() => void vi.advanceTimersByTime(2));
    expect(result.current).toBe("b");
  });

  it("restarts the wait with every change, so only the last of a burst gets through", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), { initialProps: { value: "" } });
    const seen: string[] = [];

    for (const typed of ["t", "to", "toy"]) {
      rerender({ value: typed });
      act(() => void vi.advanceTimersByTime(200)); // faster than the delay
      seen.push(result.current);
    }
    expect(seen).toEqual(["", "", ""]);

    act(() => void vi.advanceTimersByTime(300));
    expect(result.current).toBe("toy");
  });

  it("works with objects, as a filters form is", () => {
    const first = { make: "" };
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 100), { initialProps: { value: first } });
    const next = { make: "toy" };

    rerender({ value: next });
    act(() => void vi.advanceTimersByTime(100));

    expect(result.current).toBe(next);
  });

  it("leaves no timer behind when the screen goes away", () => {
    const { rerender, unmount } = renderHook(({ value }) => useDebouncedValue(value, 300), { initialProps: { value: "a" } });
    rerender({ value: "b" });
    expect(vi.getTimerCount()).toBe(1);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
