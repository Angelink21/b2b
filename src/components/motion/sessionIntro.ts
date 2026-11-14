const STORAGE_KEY = "fagor-lineup-intro-played";

/** Returns true if the home lineup intro has already played this session. */
export function hasPlayedLineupIntro(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Mark the home lineup intro as played (try/catch for private mode). */
export function markLineupIntroPlayed(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // ignore quota / private mode
  }
}
