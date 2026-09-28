import { describe, expect, it } from "vitest";
import { countLines, countWords, estimateText, estimateTokens } from "@/lib/token-estimator";

describe("token estimation", () => {
  it("estimates ~1 token per 4 characters, rounding up", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("a")).toBe(1);
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("abcde")).toBe(2);
    expect(estimateTokens("x".repeat(400))).toBe(100);
  });

  it("counts words and lines", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   ")).toBe(0);
    expect(countWords(" hello   world\nagain ")).toBe(3);
    expect(countLines("")).toBe(0);
    expect(countLines("a\nb\n")).toBe(2);
    expect(countLines("a\nb\nc")).toBe(3);
  });

  it("returns a full estimate object", () => {
    expect(estimateText("You are a helpful assistant.")).toEqual({
      characters: 28,
      words: 5,
      lines: 1,
      approxTokens: 7,
    });
  });

  it("handles large input quickly", () => {
    const big = "word ".repeat(200_000);
    const start = performance.now();
    const est = estimateText(big);
    expect(est.words).toBe(200_000);
    expect(performance.now() - start).toBeLessThan(1000);
  });
});
