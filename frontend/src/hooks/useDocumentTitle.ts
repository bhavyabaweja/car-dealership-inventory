import { useEffect } from "react";

const APP_NAME = "Car Dealership";

/** Names the browser tab for the page on screen. A single-page app has to do this itself: it is what a screen reader announces on arrival. */
export function useDocumentTitle(page: string): void {
  useEffect(() => {
    document.title = `${page} | ${APP_NAME}`;
  }, [page]);
}
