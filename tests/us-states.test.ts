import { describe, it, expect } from "vitest";
import { US_STATES, STATE_ABBRS } from "@/lib/us-states";

describe("US_STATES", () => {
  it("has 51 entries (50 states + DC)", () => {
    expect(US_STATES.length).toBe(51);
  });

  it("includes CA and DC", () => {
    expect(STATE_ABBRS.has("CA")).toBe(true);
    expect(STATE_ABBRS.has("DC")).toBe(true);
  });

  it("rejects unknown abbreviations", () => {
    expect(STATE_ABBRS.has("ZZ")).toBe(false);
  });

  it("has unique abbreviations and slugs", () => {
    expect(new Set(US_STATES.map((s) => s.abbr)).size).toBe(US_STATES.length);
    expect(US_STATES.every((s) => s.abbr.length === 2 && s.name.length > 0)).toBe(true);
  });
});
