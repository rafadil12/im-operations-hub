import { describe, expect, it } from "vitest";
import { splitTargetLines } from "./targetLines";

describe("splitTargetLines", () => {
  it("splits inline numbered targets", () => {
    expect(splitTargetLines("1. Throughput rate 2. Data modification")).toEqual([
      "1. Throughput rate",
      "2. Data modification",
    ]);
  });

  it("splits newline-separated targets", () => {
    expect(splitTargetLines("1. Data reporting\n2. Energy consumption")).toEqual([
      "1. Data reporting",
      "2. Energy consumption",
    ]);
  });

  it("returns a single line when there is no numbering", () => {
    expect(splitTargetLines("New access control and cable repairs")).toEqual([
      "New access control and cable repairs",
    ]);
  });

  it("returns empty for blank input", () => {
    expect(splitTargetLines("")).toEqual([]);
    expect(splitTargetLines("—")).toEqual([]);
  });
});
