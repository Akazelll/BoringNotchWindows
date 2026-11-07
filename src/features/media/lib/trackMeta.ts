export function isInvalidArtist(name: string): boolean {
  if (!name) return true;
  const s = name.trim().toLowerCase();
  return (
    s === "" ||
    s === "spotify" ||
    s === "spotify ab" ||
    s === "spotify web player" ||
    s === "web player" ||
    s === "unknown artist" ||
    s === "various artists" ||
    s === "windows audio" ||
    s.includes("spotify.com") ||
    s.includes("youtube.com") ||
    s.endsWith(".com") ||
    s.endsWith(".net") ||
    s.endsWith(".org") ||
    s.startsWith("http://") ||
    s.startsWith("https://") ||
    s === "chrome" ||
    s === "google chrome" ||
    s === "msedge" ||
    s === "microsoft edge" ||
    s === "brave" ||
    s === "firefox" ||
    s === "opera"
  );
}

function cleanTitle(raw: string): string {
  let s = raw
    // Strip Spotify web suffix e.g. " | Spotify", " - Spotify", " on Spotify"
    .replace(/\s*\|\s*(spotify|web player|youtube).*$/gi, "")
    .replace(/\s*[-–—]\s*spotify\b.*$/gi, "")
    .replace(/\s+on\s+spotify\b.*$/gi, "")
    // Strip Spotify prefix e.g. "Spotify – ", "Spotify - "
    .replace(/^spotify\s*[-–—:]\s*/gi, "")
    // Strip " - song (and lyrics) by Artist" pattern from Spotify web
    .replace(/\s*[-–—]\s*song(?:\s+(?:and|&)\s+lyrics)?\s+by\s+.*$/gi, "")
    // Strip bracketed text like (Official Video), [MV], (Lyric Video), (Official Audio), (Remastered...), (Live...), etc.
    .replace(/\s*[\(\[\{][^\)\]\}]*[\)\]\}]/gi, "")
    // Strip buzzwords
    .replace(
      /\b(official\s*(music)?\s*video|official\s*audio|lyric\s*video|lirik|audio|visualizer|remastered|remix|hd|4k|mv)\b/gi,
      ""
    )
    // Strip "feat." or "ft."
    .replace(/\b(feat|ft)\.?\s+[\w\s&]+/gi, "")
    .trim();

  // Strip trailing/leading punctuation
  s = s.replace(/^[\s\-_:.]+|[\s\-_:.]+$/g, "").trim();

  return s || raw;
}

export function parseTrackAndArtist(
  rawTitle: string,
  rawArtist: string
): { cleanTitle: string; cleanArtist: string } {
  let cleanedTitle = cleanTitle(rawTitle);
  let cleanedArtist = (rawArtist || "").trim();

  // Pattern: "Song - song and lyrics by Artist | Spotify"
  const songByMatch = rawTitle.match(
    /^(.*?)\s*[-–—]\s*song(?:\s+(?:and|&)\s+lyrics)?\s+by\s+([^|]+)(?:\|.*)?$/i
  );
  if (songByMatch) {
    cleanedTitle = cleanTitle(songByMatch[1]);
    if (isInvalidArtist(cleanedArtist)) {
      cleanedArtist = songByMatch[2].trim();
    }
  }

  // If artist is invalid or empty, try extracting from title
  if (isInvalidArtist(cleanedArtist)) {
    cleanedArtist = "";
    // Separator: bullet (•), middle dot (·), pipe (|)
    const bulletParts = cleanedTitle.split(/\s*[•·|]\s*/);
    if (bulletParts.length >= 2) {
      cleanedTitle = bulletParts[0].trim();
      cleanedArtist = bulletParts[1].trim();
    } else {
      // Separator: dash with spaces (" - ", " – ", " — ")
      const dashParts = cleanedTitle.split(/\s*[-–—]\s+/);
      if (dashParts.length === 2) {
        cleanedTitle = dashParts[0].trim();
        cleanedArtist = dashParts[1].trim();
      }
    }
  }

  if (cleanedArtist) {
    cleanedArtist = cleanedArtist
      .split(/[,&/]|(\bfeat\b)|(\bft\b)/i)[0]
      .replace(/^[\s\-_:.]+|[\s\-_:.]+$/g, "")
      .trim();
  }

  cleanedTitle = cleanedTitle.replace(/^[\s\-_:.]+|[\s\-_:.]+$/g, "").trim();

  return {
    cleanTitle: cleanedTitle || rawTitle,
    cleanArtist: isInvalidArtist(cleanedArtist) ? "" : cleanedArtist,
  };
}