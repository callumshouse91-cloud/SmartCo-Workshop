export const INTRO_DISMISSED_KEY = "smartco-intro-dismissed";

/** Use on Tooling / Questions "Board" links so `/` opens the whiteboard, not the intro deck. */
export const BOARD_NAV_HREF = "/?view=board";

export function markIntroDismissed(): void {
  try {
    localStorage.setItem(INTRO_DISMISSED_KEY, "true");
  } catch {
    /* ignore */
  }
}

export function clearIntroDismissed(): void {
  try {
    localStorage.removeItem(INTRO_DISMISSED_KEY);
  } catch {
    /* ignore */
  }
}

export function shouldRestoreBoardView(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("view") === "board") return true;
    return localStorage.getItem(INTRO_DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}
