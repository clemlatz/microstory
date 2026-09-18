import { describe, expect, it, beforeEach } from "vitest";
import { createRef } from "react";
import { renderHook, act } from "@testing-library/react";
import { useScrollRestoration } from "./useScrollRestoration";

describe("useScrollRestoration", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("restores a previously saved scroll position on mount", () => {
    sessionStorage.setItem("microstory_scroll_test-key", "250");
    const element = document.createElement("div");
    Object.defineProperty(element, "scrollTop", { value: 0, writable: true });
    const ref = createRef<HTMLDivElement>();
    ref.current = element;

    renderHook(() => useScrollRestoration(ref, "test-key"));

    expect(element.scrollTop).toBe(250);
  });

  it("persists the scroll position when the element scrolls", () => {
    const element = document.createElement("div");
    Object.defineProperty(element, "scrollTop", { value: 0, writable: true });
    const ref = createRef<HTMLDivElement>();
    ref.current = element;

    renderHook(() => useScrollRestoration(ref, "test-key"));

    act(() => {
      element.scrollTop = 400;
      element.dispatchEvent(new Event("scroll"));
    });

    expect(sessionStorage.getItem("microstory_scroll_test-key")).toBe("400");
  });

  it("reapplies the saved position once content finishes loading asynchronously", async () => {
    sessionStorage.setItem("microstory_scroll_test-key", "300");
    const element = document.createElement("div");
    let maxScroll = 0;
    let internalScrollTop = 0;
    Object.defineProperty(element, "scrollTop", {
      get: () => internalScrollTop,
      set: (value: number) => {
        internalScrollTop = Math.min(value, maxScroll);
      },
    });
    const ref = createRef<HTMLDivElement>();
    ref.current = element;

    renderHook(() => useScrollRestoration(ref, "test-key"));

    // Nothing has rendered yet (e.g. a list still fetching data), so the
    // container isn't tall enough to scroll and the restore is clamped away.
    expect(element.scrollTop).toBe(0);

    // The list's content arrives, making the container tall enough to
    // actually hold the saved position.
    await act(async () => {
      maxScroll = 500;
      element.appendChild(document.createElement("div"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(element.scrollTop).toBe(300);
  });

  it("starts at the top when nothing was saved for that key", () => {
    const element = document.createElement("div");
    Object.defineProperty(element, "scrollTop", { value: 120, writable: true });
    const ref = createRef<HTMLDivElement>();
    ref.current = element;

    renderHook(() => useScrollRestoration(ref, "unseen-key"));

    expect(element.scrollTop).toBe(0);
  });
});
