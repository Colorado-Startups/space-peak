import { describe, expect, it } from "vitest";
import { arcPath, drawHero, STAR, SUMMIT, VIEW } from "../../src/lib/hero/draw";

describe("hero drawing", () => {
  it("is deterministic: the same bytes every call", () => {
    expect(drawHero()).toBe(drawHero());
  });
  it("draws one arc, from the summit, in granite pink", () => {
    const svg = drawHero();
    expect(svg.match(/data-layer="arc"/g)).toHaveLength(1);
    expect(arcPath().startsWith(`M${SUMMIT[0]} ${SUMMIT[1]}C`)).toBe(true);
    expect(svg).toMatch(/<path [^>]*stroke="#C67273"[^>]*data-layer="arc"/);
  });
  it("draws one small white star, to the right of and above the summit", () => {
    const svg = drawHero();
    expect(svg.match(/data-layer="star"/g)).toHaveLength(1);
    expect(svg).toMatch(/<polygon [^>]*fill="#FFFFFF" data-layer="star"/);
    const pts = svg.match(/points="([^"]+)"/)![1].split(" ");
    expect(pts).toHaveLength(10);
    expect(STAR[0]).toBeGreaterThan(SUMMIT[0]);
    expect(STAR[1]).toBeLessThan(SUMMIT[1]);
  });
  it("matches the painting's frame and stays out of the accessibility tree", () => {
    const svg = drawHero();
    expect(svg).toContain(`viewBox="0 0 ${VIEW.width} ${VIEW.height}"`);
    expect(svg).toContain('aria-hidden="true"');
    expect(svg).not.toMatch(/<text|<script/);
  });
});
