import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import type { ReactNode } from "react";
import { useFocusFirstInvalidField } from "@/hooks/form/useFocusFirstInvalidField";

const scrollIntoView = vi.fn();

type HarnessProps = Readonly<{ children?: ReactNode }>;

const Harness = ({ children }: HarnessProps) => {
  const { formRef, focusFirstInvalidField } = useFocusFirstInvalidField();

  return (
    <form ref={formRef}>
      {children}
      <button type="button" onClick={focusFirstInvalidField}>
        go
      </button>
    </form>
  );
};

const AttemptHarness = () => {
  const { formRef, focusFirstInvalidField } = useFocusFirstInvalidField();
  const [hasAttempted, setHasAttempted] = useState(false);

  const attempt = () => {
    setHasAttempted(true);
    focusFirstInvalidField();
  };

  return (
    <form ref={formRef}>
      <input aria-label="late" aria-invalid={hasAttempted ? "true" : undefined} />
      <button type="button" onClick={attempt}>
        go
      </button>
    </form>
  );
};

const go = () => screen.getByRole("button", { name: "go" });

const stubReducedMotion = (matches: boolean) => {
  const matchMedia = (query: string): MediaQueryList => ({
    matches,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  });
  Object.defineProperty(window, "matchMedia", { configurable: true, writable: true, value: matchMedia });
};

describe("useFocusFirstInvalidField", () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    scrollIntoView.mockClear();
    Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, writable: true, value: scrollIntoView });
    stubReducedMotion(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, "matchMedia", { configurable: true, writable: true, value: originalMatchMedia });
  });

  it("focuses the first aria-invalid field in DOM order, whichever field comes first", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <Harness>
        <input aria-label="one" aria-invalid="true" />
        <input aria-label="two" aria-invalid="true" />
      </Harness>,
    );
    await user.click(go());
    expect(screen.getByLabelText("one")).toHaveFocus();
    unmount();

    render(
      <Harness>
        <input aria-label="two" />
        <input aria-label="one" aria-invalid="true" />
        <input aria-label="three" aria-invalid="true" />
      </Harness>,
    );
    await user.click(go());
    expect(screen.getByLabelText("one")).toHaveFocus();
  });

  it("ignores a field marked aria-invalid false", async () => {
    const user = userEvent.setup();
    render(
      <Harness>
        <input aria-label="fine" aria-invalid="false" />
        <input aria-label="broken" aria-invalid="true" />
      </Harness>,
    );

    await user.click(go());

    expect(screen.getByLabelText("broken")).toHaveFocus();
  });

  it("scrolls the field to the center, smoothly, before focusing it without scrolling again", async () => {
    const user = userEvent.setup();
    const focus = vi.spyOn(HTMLElement.prototype, "focus");
    render(
      <Harness>
        <input aria-label="broken" aria-invalid="true" />
      </Harness>,
    );

    await user.click(go());

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "center", behavior: "smooth" });
    expect(scrollIntoView.mock.contexts[0]).toBe(screen.getByLabelText("broken"));
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(scrollIntoView.mock.invocationCallOrder[0]).toBeLessThan(focus.mock.invocationCallOrder[focus.mock.calls.length - 1]);
  });

  it("scrolls without animation when the user prefers reduced motion", async () => {
    const user = userEvent.setup();
    stubReducedMotion(true);
    render(
      <Harness>
        <input aria-label="broken" aria-invalid="true" />
      </Harness>,
    );

    await user.click(go());

    expect(scrollIntoView).toHaveBeenCalledWith({ block: "center", behavior: "auto" });
  });

  it("falls back to the first data-invalid input or textarea when nothing is aria-invalid", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <Harness>
        <div data-invalid="true">
          <textarea aria-label="area" />
        </div>
        <div data-invalid="true">
          <input aria-label="field" />
        </div>
      </Harness>,
    );
    await user.click(go());
    expect(screen.getByLabelText("area")).toHaveFocus();
    unmount();

    render(
      <Harness>
        <div>
          <input aria-label="valid" />
        </div>
        <div data-invalid="true">
          <input aria-label="field" />
        </div>
      </Harness>,
    );
    await user.click(go());
    expect(screen.getByLabelText("field")).toHaveFocus();
  });

  it("prefers an aria-invalid field over an earlier data-invalid one", async () => {
    const user = userEvent.setup();
    render(
      <Harness>
        <div data-invalid="true">
          <input aria-label="wrapped" />
        </div>
        <input aria-label="marked" aria-invalid="true" />
      </Harness>,
    );

    await user.click(go());

    expect(screen.getByLabelText("marked")).toHaveFocus();
  });

  it("focuses the first control inside an invalid group that cannot take focus itself", async () => {
    const user = userEvent.setup();
    render(
      <Harness>
        <div role="radiogroup" aria-label="format" aria-invalid="true">
          <input type="radio" aria-label="bottle" name="format" />
          <input type="radio" aria-label="can" name="format" />
        </div>
      </Harness>,
    );

    await user.click(go());

    expect(screen.getByLabelText("bottle")).toHaveFocus();
  });

  it("does nothing when no field is invalid", async () => {
    const user = userEvent.setup();
    render(
      <Harness>
        <input aria-label="fine" />
      </Harness>,
    );

    await user.click(go());

    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(screen.getByLabelText("fine")).not.toHaveFocus();
  });

  it("waits for the render that follows the call, so a field marked invalid by the same press gets the focus", async () => {
    const user = userEvent.setup();
    render(<AttemptHarness />);
    expect(screen.getByLabelText("late")).not.toHaveAttribute("aria-invalid");

    await user.click(go());

    expect(screen.getByLabelText("late")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("late")).toHaveFocus();
  });

  it("focuses again on a second call even when the same field stays invalid", async () => {
    const user = userEvent.setup();
    render(
      <Harness>
        <input aria-label="broken" aria-invalid="true" />
      </Harness>,
    );
    await user.click(go());
    expect(scrollIntoView).toHaveBeenCalledTimes(1);

    await user.click(go());

    expect(scrollIntoView).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText("broken")).toHaveFocus();
  });
});
