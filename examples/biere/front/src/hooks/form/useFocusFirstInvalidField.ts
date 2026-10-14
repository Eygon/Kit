import { useCallback, useEffect, useRef, useState } from "react";

const ARIA_INVALID_SELECTOR = '[aria-invalid="true"]';
const DATA_INVALID_SELECTOR = "[data-invalid] input, [data-invalid] textarea";
const FOCUSABLE_SELECTOR = "input, textarea, select, button, [tabindex]";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const getFocusTarget = (field: HTMLElement): HTMLElement | null =>
  field.matches(FOCUSABLE_SELECTOR) ? field : field.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);

export const useFocusFirstInvalidField = () => {
  const formRef = useRef<HTMLFormElement>(null);
  const [requestCount, setRequestCount] = useState(0);

  const focusFirstInvalidField = useCallback(() => setRequestCount((previous) => previous + 1), []);

  useEffect(() => {
    if (requestCount === 0 || formRef.current === null) return;
    const form = formRef.current;
    const invalidField =
      form.querySelector<HTMLElement>(ARIA_INVALID_SELECTOR) ?? form.querySelector<HTMLElement>(DATA_INVALID_SELECTOR);
    const target = invalidField === null ? null : getFocusTarget(invalidField);
    if (target === null) return;
    const prefersReducedMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches;
    target.scrollIntoView({ block: "center", behavior: prefersReducedMotion ? "auto" : "smooth" });
    target.focus({ preventScroll: true });
  }, [requestCount]);

  return { formRef, focusFirstInvalidField };
};
