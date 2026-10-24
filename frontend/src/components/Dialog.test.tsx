import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Dialog } from "./Dialog";

/** What a browser does when Escape is pressed in a modal dialog: it sends "cancel" first. */
const pressEscape = (dialog: HTMLElement) => {
  const cancel = new Event("cancel", { cancelable: true });
  fireEvent(dialog, cancel);
  return cancel;
};

function Harness({ onClose = () => {} }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      {open && (
        <Dialog
          title="Edit Toyota Camry"
          onClose={() => {
            onClose();
            setOpen(false);
          }}
        >
          <input aria-label="Make" />
          <button data-autofocus>Cancel</button>
        </Dialog>
      )}
    </>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Dialog", () => {
  it("opens as a modal dialog named by its title, with its content inside", () => {
    const showModal = vi.spyOn(HTMLDialogElement.prototype, "showModal");
    render(
      <Dialog title="Edit Toyota Camry" onClose={() => {}}>
        <input aria-label="Make" />
      </Dialog>,
    );

    const dialog = screen.getByRole("dialog", { name: "Edit Toyota Camry" });
    expect(showModal).toHaveBeenCalledOnce();
    expect(dialog).toContainElement(screen.getByLabelText("Make"));
    expect(screen.getByRole("heading", { name: "Edit Toyota Camry" })).toBeInTheDocument();
  });

  it("puts the cursor on the element that asks for it, so a destructive dialog can start on Cancel", async () => {
    render(<Harness />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Open" }));

    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  });

  describe("closing", () => {
    it("closes on Escape, and keeps the decision with the app by cancelling the browser's own close", () => {
      const onClose = vi.fn();
      render(
        <Dialog title="Edit" onClose={onClose}>
          <p>content</p>
        </Dialog>,
      );

      const cancel = pressEscape(screen.getByRole("dialog"));

      expect(onClose).toHaveBeenCalledOnce();
      expect(cancel.defaultPrevented).toBe(true);
    });

    it("closes when the backdrop is clicked, but not when the content is", async () => {
      const onClose = vi.fn();
      render(
        <Dialog title="Edit" onClose={onClose}>
          <p>content</p>
        </Dialog>,
      );
      const user = userEvent.setup();

      await user.click(screen.getByText("content"));
      expect(onClose).not.toHaveBeenCalled();

      await user.click(screen.getByRole("dialog")); // the backdrop is the dialog element itself
      expect(onClose).toHaveBeenCalledOnce();
    });

    it("does not close when a press that started inside, such as selecting text, ends on the backdrop", () => {
      const onClose = vi.fn();
      render(
        <Dialog title="Edit" onClose={onClose}>
          <p>content</p>
        </Dialog>,
      );
      const dialog = screen.getByRole("dialog");

      fireEvent.mouseDown(screen.getByText("content"));
      fireEvent.mouseUp(dialog);
      fireEvent.click(dialog);

      expect(onClose).not.toHaveBeenCalled();
    });

    it("hands focus back to what opened it, so a keyboard user is not dropped at the top of the page", async () => {
      const user = userEvent.setup();
      render(<Harness />);
      const opener = screen.getByRole("button", { name: "Open" });
      await user.click(opener);
      expect(opener).not.toHaveFocus();

      pressEscape(screen.getByRole("dialog"));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(opener).toHaveFocus();
    });

    describe("when what opened it is gone by the time it closes, as after deleting the item it was about", () => {
      function Vanishing({ withFallback }: { withFallback: boolean }) {
        const [open, setOpen] = useState(false);
        const [deleted, setDeleted] = useState(false);
        return (
          <>
            {withFallback && (
              <h1 tabIndex={-1} data-focus-fallback>
                Vehicles
              </h1>
            )}
            {!deleted && <button onClick={() => setOpen(true)}>Delete Camry</button>}
            {open && (
              <Dialog title="Delete Camry?" onClose={() => {}}>
                <button
                  onClick={() => {
                    setOpen(false);
                    setDeleted(true);
                  }}
                >
                  Confirm
                </button>
              </Dialog>
            )}
          </>
        );
      }

      it("moves focus to the element marked as the fallback, so the keyboard user keeps their place", async () => {
        const user = userEvent.setup();
        render(<Vanishing withFallback />);

        await user.click(screen.getByRole("button", { name: "Delete Camry" }));
        await user.click(screen.getByRole("button", { name: "Confirm" }));

        expect(screen.queryByRole("button", { name: "Delete Camry" })).not.toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Vehicles" })).toHaveFocus();
      });

      it("copes when the page marks no fallback", async () => {
        const user = userEvent.setup();
        render(<Vanishing withFallback={false} />);

        await user.click(screen.getByRole("button", { name: "Delete Camry" }));
        await user.click(screen.getByRole("button", { name: "Confirm" }));

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });
  });

  it("closes the native dialog when it goes away, releasing the page behind it", () => {
    const close = vi.spyOn(HTMLDialogElement.prototype, "close");
    const { unmount } = render(
      <Dialog title="Edit" onClose={() => {}}>
        <p>content</p>
      </Dialog>,
    );

    unmount();

    expect(close).toHaveBeenCalled();
  });
});
