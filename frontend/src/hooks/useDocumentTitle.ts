import { useEffect } from "react";
import { BRAND_NAME } from "../brand";

/** Names the browser tab for the page on screen. A single-page app has to do this itself: it is what a screen reader announces on arrival. */
export function useDocumentTitle(page: string): void {
  useEffect(() => {
    document.title = `${page} | ${BRAND_NAME}`;
  }, [page]);
}
