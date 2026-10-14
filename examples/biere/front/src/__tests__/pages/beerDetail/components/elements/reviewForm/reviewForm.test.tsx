import { AvatarEnum } from "@/types/enums/user/avatarEnum";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import { ReviewForm } from "@/pages/beerDetail/components/elements/reviewForm/reviewForm";
import type { Review } from "@/types/models/review/review";

const scrollIntoView = vi.fn();

const REVIEW: Review = {
  id: 5,
  beerId: 7,
  authorId: 2,
  authorName: "Bob",
  authorAvatar: AvatarEnum.HOP,
  rating: 4.5,
  text: "Très bonne",
  sweetness: 2,
  acidity: null,
  body: 5,
  createdAt: "2026-10-01T10:00:00.000Z",
  updatedAt: "2026-10-02T10:00:00.000Z",
  isMine: true,
};

const onSubmit = vi.fn();

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const renderForm = (
  props: { initialReview?: Review | null; isSaving?: boolean } = {},
) =>
  renderWithProviders(
    <ReviewForm
      initialReview={null}
      isSaving={false}
      onSubmit={onSubmit}
      {...props}
    />,
  );

const ratingSlider = () => screen.getByRole("slider", { name: "Note" });
const criterionSlider = (name: string) => screen.getByRole("slider", { name });
const submitButton = () =>
  screen.getByRole("button", { name: "Publier mon avis" });
const textArea = () =>
  screen.getByRole("textbox", { name: "Votre avis" }) as HTMLTextAreaElement;
const starStates = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("[data-state]")).map((star) =>
    star.getAttribute("data-state"),
  );

const chooseRating = async (user: ReturnType<typeof userEvent.setup>) => {
  ratingSlider().focus();
  await user.keyboard("{ArrowRight}");
};

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    writable: true,
    value: scrollIntoView,
  });
  onSubmit.mockResolvedValue(undefined);
});

describe("ReviewForm", () => {
  describe("AC1 an empty form is submitted", () => {
    it("asks for a rating and sends nothing", async () => {
      const user = userEvent.setup();
      renderForm();
      expect(
        screen.queryByText("La note est obligatoire"),
      ).not.toBeInTheDocument();

      await user.click(submitButton());

      expect(screen.getByText("La note est obligatoire")).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("links the rating error to the rating slider", async () => {
      const user = userEvent.setup();
      renderForm();
      expect(ratingSlider()).not.toHaveAccessibleDescription(
        "La note est obligatoire",
      );

      await user.click(submitButton());

      expect(screen.getByRole("alert")).toHaveTextContent(
        "La note est obligatoire",
      );
      expect(ratingSlider()).toHaveAccessibleDescription(
        "La note est obligatoire",
      );
    });

    it("shows the rating error under the rating slider, before the criteria", async () => {
      const user = userEvent.setup();
      renderForm();

      await user.click(submitButton());

      const alert = screen.getByRole("alert");
      expect(
        ratingSlider().compareDocumentPosition(alert) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        alert.compareDocumentPosition(criterionSlider("Douceur")) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it("shows no rating at first and clears the error once a rating is chosen", async () => {
      const user = userEvent.setup();
      const { container } = renderForm();
      expect(screen.getByText("Aucune note")).toBeInTheDocument();
      expect(starStates(container)).toEqual([
        "empty",
        "empty",
        "empty",
        "empty",
        "empty",
      ]);
      await user.click(submitButton());
      expect(screen.getByText("La note est obligatoire")).toBeInTheDocument();

      await chooseRating(user);

      expect(
        screen.queryByText("La note est obligatoire"),
      ).not.toBeInTheDocument();
    });
  });

  describe("AC2 the rating slider", () => {
    it("goes from 3 to 3,5 with the right arrow and shows three and a half stars", async () => {
      const user = userEvent.setup();
      const { container } = renderForm();

      await chooseRating(user);

      expect(ratingSlider()).toHaveValue("3.5");
      expect(screen.getByText("3,5 sur 5")).toBeInTheDocument();
      expect(starStates(container)).toEqual([
        "full",
        "full",
        "full",
        "half",
        "empty",
      ]);
    });

    it("goes to 1 with Home and to 5 with End", async () => {
      const user = userEvent.setup();
      const { container } = renderForm();
      ratingSlider().focus();

      await user.keyboard("{Home}");
      expect(ratingSlider()).toHaveValue("1");
      expect(screen.getByText("1 sur 5")).toBeInTheDocument();
      expect(starStates(container)).toEqual([
        "full",
        "empty",
        "empty",
        "empty",
        "empty",
      ]);

      await user.keyboard("{End}");
      expect(ratingSlider()).toHaveValue("5");
      expect(screen.getByText("5 sur 5")).toBeInTheDocument();
      expect(starStates(container)).toEqual([
        "full",
        "full",
        "full",
        "full",
        "full",
      ]);
    });

    it("steps back by half a point with the left arrow", async () => {
      const user = userEvent.setup();
      renderForm();
      ratingSlider().focus();

      await user.keyboard("{ArrowLeft}");

      expect(ratingSlider()).toHaveValue("2.5");
      expect(screen.getByText("2,5 sur 5")).toBeInTheDocument();
    });
  });

  describe("AC3 the criteria", () => {
    it("shows every criterion as not rated at first", () => {
      renderForm();

      expect(screen.getAllByText("Non renseigné")).toHaveLength(3);
      expect(criterionSlider("Douceur")).toHaveValue("0");
      expect(criterionSlider("Acidité")).toHaveAttribute("max", "5");
    });

    it("sends a criterion left at 0 as absent and a criterion at 4 as 4 with its label shown", async () => {
      const user = userEvent.setup();
      renderForm();
      await chooseRating(user);
      criterionSlider("Douceur").focus();
      await user.keyboard("{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}");

      expect(screen.getByText("Douce")).toBeInTheDocument();
      expect(screen.getAllByText("Non renseigné")).toHaveLength(2);

      await user.click(submitButton());

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit).toHaveBeenCalledWith({
        rating: 3.5,
        text: "",
        sweetness: 4,
        acidity: null,
        body: null,
      });
    });

    it("sends the text typed with the rating", async () => {
      const user = userEvent.setup();
      renderForm();
      await chooseRating(user);
      await user.type(textArea(), "Top");

      await user.click(submitButton());

      await waitFor(() =>
        expect(onSubmit).toHaveBeenCalledWith({
          rating: 3.5,
          text: "Top",
          sweetness: null,
          acidity: null,
          body: null,
        }),
      );
    });
  });

  describe("AC4 the text", () => {
    it("counts the characters out of 500", async () => {
      const user = userEvent.setup();
      renderForm();
      expect(screen.getByText("0 / 500")).toBeInTheDocument();

      await user.type(textArea(), "Très bonne");

      expect(screen.getByText("10 / 500")).toBeInTheDocument();
    });

    it("stops the input at 500 characters", async () => {
      const user = userEvent.setup();
      renderForm();
      expect(textArea()).toHaveAttribute("maxlength", "500");

      await user.click(textArea());
      await user.paste("a".repeat(600));

      expect(textArea().value).toHaveLength(500);
      expect(screen.getByText("500 / 500")).toBeInTheDocument();
    });
  });

  describe("AC5 an existing review", () => {
    it("prefills the rating, the text and the criteria of the review", () => {
      const { container } = renderForm({ initialReview: REVIEW });

      expect(ratingSlider()).toHaveValue("4.5");
      expect(screen.getByText("4,5 sur 5")).toBeInTheDocument();
      expect(starStates(container)).toEqual([
        "full",
        "full",
        "full",
        "full",
        "half",
      ]);
      expect(textArea().value).toBe("Très bonne");
      expect(screen.getByText("10 / 500")).toBeInTheDocument();
      expect(criterionSlider("Douceur")).toHaveValue("2");
      expect(screen.getByText("Sèche")).toBeInTheDocument();
      expect(criterionSlider("Acidité")).toHaveValue("0");
      expect(criterionSlider("Corps")).toHaveValue("5");
      expect(screen.getByText("Très plein")).toBeInTheDocument();
      expect(screen.queryByText("Aucune note")).not.toBeInTheDocument();
    });

    it("sends the review as it was when nothing is changed", async () => {
      const user = userEvent.setup();
      renderForm({ initialReview: REVIEW });

      await user.click(submitButton());

      await waitFor(() =>
        expect(onSubmit).toHaveBeenCalledWith({
          rating: 4.5,
          text: "Très bonne",
          sweetness: 2,
          acidity: null,
          body: 5,
        }),
      );
    });
  });

  describe("AC6 a double press on the submit button", () => {
    it("sends once and shows the pending state", async () => {
      const pending = deferred<void>();
      onSubmit.mockReturnValue(pending.promise);
      const view = renderForm({ initialReview: REVIEW });
      expect(submitButton()).not.toHaveAttribute("data-pending");

      fireEvent.click(submitButton());
      fireEvent.click(submitButton());

      expect(onSubmit).toHaveBeenCalledTimes(1);
      view.rerender(
        <ReviewForm initialReview={REVIEW} isSaving onSubmit={onSubmit} />,
      );
      expect(
        screen.getByRole("button", { name: /Enregistrement…/ }),
      ).toHaveAttribute("data-pending", "true");
      pending.resolve();
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    });

    it("accepts a new submit once the previous one has failed", async () => {
      onSubmit
        .mockRejectedValueOnce(new Error("boom"))
        .mockResolvedValue(undefined);
      const user = userEvent.setup();
      renderForm({ initialReview: REVIEW });

      await user.click(submitButton());
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      await user.click(submitButton());

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
    });
  });

  describe("AC7 the rating is missing on submit", () => {
    it("marks the rating slider invalid, scrolls to it and focuses it", async () => {
      const user = userEvent.setup();
      renderForm();
      expect(ratingSlider()).not.toHaveAttribute("aria-invalid", "true");

      await user.click(submitButton());

      await waitFor(() => expect(ratingSlider()).toHaveFocus());
      expect(ratingSlider()).toHaveAttribute("aria-invalid", "true");
      expect(scrollIntoView).toHaveBeenCalledWith({
        block: "center",
        behavior: "smooth",
      });
      expect(scrollIntoView.mock.contexts.at(-1)).toBe(ratingSlider());
      expect(screen.getByRole("alert")).toHaveTextContent(
        "La note est obligatoire",
      );
      expect(ratingSlider()).toHaveAccessibleDescription(
        "La note est obligatoire",
      );
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("drops the invalid mark once a rating is chosen", async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(submitButton());
      await waitFor(() => expect(ratingSlider()).toHaveFocus());

      await chooseRating(user);

      expect(ratingSlider()).not.toHaveAttribute("aria-invalid", "true");
      expect(
        screen.queryByText("La note est obligatoire"),
      ).not.toBeInTheDocument();
    });

    it("does not touch the focus when the review is valid", async () => {
      const user = userEvent.setup();
      renderForm({ initialReview: REVIEW });

      await user.click(submitButton());

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(scrollIntoView).not.toHaveBeenCalled();
      expect(ratingSlider()).not.toHaveAttribute("aria-invalid", "true");
    });
  });

  describe("AC8 the sending state of the button", () => {
    it("shows Enregistrement… and is busy while the review is being sent", () => {
      renderForm({ isSaving: true });

      const button = screen.getByRole("button", { name: /Enregistrement…/ });
      expect(button).toHaveAttribute("aria-busy", "true");
      expect(
        screen.queryByRole("button", { name: "Publier mon avis" }),
      ).not.toBeInTheDocument();
    });

    it("sends nothing when the busy button is pressed again", async () => {
      const user = userEvent.setup();
      renderForm({ initialReview: REVIEW, isSaving: true });

      await user.click(screen.getByRole("button", { name: /Enregistrement…/ }));

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("takes its label back once the sending is over, whether it worked or failed", async () => {
      const view = renderForm({ initialReview: REVIEW, isSaving: true });
      expect(
        screen.getByRole("button", { name: /Enregistrement…/ }),
      ).toBeInTheDocument();

      view.rerender(
        <ReviewForm
          initialReview={REVIEW}
          isSaving={false}
          onSubmit={onSubmit}
        />,
      );

      expect(submitButton()).toHaveAttribute("aria-busy", "false");
      expect(
        screen.queryByRole("button", { name: /Enregistrement…/ }),
      ).not.toBeInTheDocument();
    });
  });

  it("labels the form fields inside one form", () => {
    renderForm();

    const form = submitButton().closest("form") as HTMLFormElement;
    expect(within(form).getAllByRole("slider")).toHaveLength(4);
    expect(
      within(form).getByRole("textbox", { name: "Votre avis" }),
    ).toBeInTheDocument();
  });

  it("gives the submit button the large size", () => {
    renderForm();

    expect(submitButton().className).toContain("button--lg");
  });
});
