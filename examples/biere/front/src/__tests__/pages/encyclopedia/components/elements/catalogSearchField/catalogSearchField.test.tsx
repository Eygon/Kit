import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach } from "vitest";
import i18n from "@/i18n/i18n";
import { CatalogSearchField } from "@/pages/encyclopedia/components/elements/catalogSearchField/catalogSearchField";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

const onSearchChange = vi.fn();

const renderField = (value = "") => {
  const view = renderWithProviders(
    <CatalogSearchField value={value} onSearchChange={onSearchChange} />,
  );
  const rerenderWith = (nextValue: string) =>
    view.rerender(
      <CatalogSearchField value={nextValue} onSearchChange={onSearchChange} />,
    );
  return { rerenderWith };
};

const typeText = (text: string) =>
  fireEvent.change(getInput(), { target: { value: text } });

const getInput = () =>
  screen.getByRole("searchbox", {
    name: "Rechercher une bière ou une brasserie",
  });

describe("CatalogSearchField", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(async () => {
    vi.useRealTimers();
    await i18n.changeLanguage("fr");
  });

  it("is labelled in French and shows the value", () => {
    renderField("orval");

    expect(getInput()).toHaveValue("orval");
  });

  it("shows a short placeholder distinct from the accessible label so it is not cut on a phone", () => {
    renderField();

    expect(getInput()).toHaveAttribute("placeholder", "Bière ou brasserie");
    expect(getInput().getAttribute("placeholder")).not.toBe(
      "Rechercher une bière ou une brasserie",
    );
  });

  it("shows the short placeholder in English while keeping the English label", async () => {
    await i18n.changeLanguage("en");
    renderField();

    const input = screen.getByRole("searchbox", {
      name: "Search a beer or a brewery",
    });
    expect(input).toHaveAttribute("placeholder", "Beer or brewery");
  });

  it("limits the typed text to 100 characters", () => {
    renderField();

    expect(getInput()).toHaveAttribute("maxlength", "100");
  });

  it("reports the search only after 300 ms without typing", () => {
    renderField();

    typeText("ipa");
    act(() => vi.advanceTimersByTime(299));
    expect(onSearchChange).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(onSearchChange).toHaveBeenCalledTimes(1);
    expect(onSearchChange).toHaveBeenCalledWith("ipa");
  });

  it("restarts the pause on every keystroke and reports the last text once", () => {
    renderField();
    typeText("i");
    act(() => vi.advanceTimersByTime(250));
    typeText("ip");
    act(() => vi.advanceTimersByTime(250));
    typeText("ipa");
    act(() => vi.advanceTimersByTime(299));
    expect(onSearchChange).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(onSearchChange).toHaveBeenCalledTimes(1);
    expect(onSearchChange).toHaveBeenCalledWith("ipa");
  });

  it("reports nothing when the text is back to the current value", () => {
    renderField("ipa");

    typeText("ipax");
    typeText("ipa");
    act(() => vi.advanceTimersByTime(1000));

    expect(onSearchChange).not.toHaveBeenCalled();
  });

  it("reports nothing on mount", () => {
    renderField("orval");

    act(() => vi.advanceTimersByTime(1000));

    expect(onSearchChange).not.toHaveBeenCalled();
  });

  it("clears at once without waiting for the pause", () => {
    renderField("orval");

    fireEvent.click(
      screen.getByRole("button", { name: "Effacer la recherche" }),
    );

    expect(onSearchChange).toHaveBeenCalledTimes(1);
    expect(onSearchChange).toHaveBeenCalledWith("");
    expect(getInput()).toHaveValue("");
    act(() => vi.advanceTimersByTime(1000));
    expect(onSearchChange).toHaveBeenCalledTimes(1);
  });

  it("offers the clear button only when there is a text", () => {
    renderField();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    typeText("a");

    expect(
      screen.getByRole("button", { name: "Effacer la recherche" }),
    ).toBeInTheDocument();
  });

  it("keeps a trailing space when the reported search comes back trimmed", () => {
    const { rerenderWith } = renderField();
    typeText("lindemans ");
    act(() => vi.advanceTimersByTime(300));
    expect(onSearchChange).toHaveBeenCalledWith("lindemans ");

    rerenderWith("lindemans");

    expect(getInput()).toHaveValue("lindemans ");
    act(() => vi.advanceTimersByTime(1000));
    expect(onSearchChange).toHaveBeenCalledTimes(1);
  });

  it("follows the value when it changes from outside and reports nothing for it", () => {
    const { rerenderWith } = renderField("orval");
    typeText("orvalx");

    rerenderWith("");

    expect(getInput()).toHaveValue("");
    act(() => vi.advanceTimersByTime(1000));
    expect(onSearchChange).not.toHaveBeenCalled();

    rerenderWith("chimay");
    expect(getInput()).toHaveValue("chimay");
    act(() => vi.advanceTimersByTime(1000));
    expect(onSearchChange).not.toHaveBeenCalled();
  });
});
