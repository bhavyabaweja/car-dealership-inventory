import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom has the <dialog> element but not its methods. These stand-ins do what matters to the tests: opening
// and closing, and the "close" event. What a browser adds (trapping focus, Escape, the backdrop) is simulated
// in the tests by sending the same events a browser sends.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.show = HTMLDialogElement.prototype.showModal;
  HTMLDialogElement.prototype.close = function close() {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
}

// Testing Library only unmounts between tests on its own when test globals are enabled; they are not.
afterEach(() => {
  cleanup();
});
