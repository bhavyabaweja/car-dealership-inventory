import { type ReactNode, useEffect, useId, useRef } from "react";

interface DialogProps {
  title: string;
  /** Called for Escape and for a click on the backdrop; the caller decides whether to close. */
  onClose: () => void;
  children: ReactNode;
}

/**
 * A modal dialog on the browser's own <dialog> element, which traps focus, handles Escape and dims
 * the page for us. On a phone it rises from the bottom as a sheet; from tablet width it is centred.
 * Put `data-autofocus` on the element that should have the cursor first (a destructive dialog starts on Cancel).
 * Put `data-focus-fallback` (and tabIndex={-1}) on the page's heading: focus goes there if what opened the dialog is gone.
 */
export function Dialog({ title, onClose, children }: DialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const pressStartedOnBackdrop = useRef(false);

  useEffect(() => {
    const element = dialog.current!;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    element.showModal();
    element.querySelector<HTMLElement>("[data-autofocus]")?.focus();

    return () => {
      element.close();
      // Back to what opened it, so a keyboard user keeps their place. If that is gone (the item the dialog
      // was about was deleted), to the page's own marked spot, rather than letting focus fall to the top.
      const target = opener?.isConnected ? opener : document.querySelector<HTMLElement>("[data-focus-fallback]");
      target?.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault(); // Escape: the app decides, so the dialog is not closed behind React's back
        onClose();
      }}
      // The backdrop is the dialog element itself. Only a press that began there counts, so selecting
      // text in a field and letting go outside the box does not throw the form away.
      onMouseDown={(event) => {
        pressStartedOnBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && pressStartedOnBackdrop.current) onClose();
        pressStartedOnBackdrop.current = false;
      }}
      className="m-auto w-full max-w-lg overflow-y-auto rounded-2xl bg-surface-container p-0 text-on-surface shadow-2xl ring-1 ring-white/12 backdrop:bg-surface-container-lowest/80 backdrop:backdrop-blur-sm max-sm:m-0 max-sm:mt-auto max-sm:max-h-[92dvh] max-sm:max-w-none max-sm:rounded-b-none"
    >
      <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6">
        <h2 id={titleId} className="font-display text-xl font-semibold tracking-tight">
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  );
}
