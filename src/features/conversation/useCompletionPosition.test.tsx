// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { useRef } from "react";
import { useCompletionPosition } from "./useCompletionPosition";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function Menu({ content, label }: { content: unknown; label: string }) {
  const input = useRef<HTMLTextAreaElement>(null);
  const popup = useCompletionPosition(input, content, 1, {
    preferAbove: true,
    gap: 4,
  });
  return (
    <form>
      <textarea ref={input} aria-label={label} />
      <section ref={popup} aria-label="Suggestions" />
    </form>
  );
}

it("reads the anchor once per displayed content, not on every render", () => {
  const observed: Element[] = [];
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe(element: Element) {
        observed.push(element);
      }
      disconnect() {}
    },
  );
  const rect = vi
    .spyOn(HTMLFormElement.prototype, "getBoundingClientRect")
    .mockReturnValue({
      top: 600,
      bottom: 640,
      left: 20,
      right: 320,
      width: 300,
      height: 40,
    } as DOMRect);
  const first = { items: ["a"] };
  const view = render(<Menu content={first} label="one" />);
  const menu = view.getByLabelText("Suggestions");
  expect(rect).toHaveBeenCalledTimes(1);
  expect(menu.style).toMatchObject({
    left: "20px",
    top: "596px",
    width: "300px",
    transform: "translateY(-100%)",
  });
  // Unrelated host renders keep the placement; the observers still track the anchor.
  view.rerender(<Menu content={first} label="two" />);
  expect(rect).toHaveBeenCalledTimes(1);
  expect(observed).toHaveLength(1);
  view.rerender(<Menu content={{ items: ["a", "b"] }} label="two" />);
  expect(rect).toHaveBeenCalledTimes(2);
  rect.mockRestore();
});
