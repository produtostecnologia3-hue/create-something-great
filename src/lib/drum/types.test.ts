import { describe, expect, it } from "vitest";
import { accentFor, clampBpm } from "./types";

describe("metronome rules", () => {
  it("clamps BPM between 30 and 300", () => {
    expect(clampBpm(10)).toBe(30);
    expect(clampBpm(400)).toBe(300);
    expect(clampBpm(120.4)).toBe(120);
  });
  it("accents beat 1, and beat 4 in 6/8", () => {
    expect(accentFor("4/4", 0)).toBe("strong");
    expect(accentFor("4/4", 3)).toBe("weak");
    expect(accentFor("6/8", 3)).toBe("medium");
  });
});
