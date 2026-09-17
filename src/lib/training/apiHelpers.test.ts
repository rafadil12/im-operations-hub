import { describe, expect, it } from "vitest";
import { resolveSessionTopics, toTitleCase } from "./apiHelpers";

describe("toTitleCase", () => {
  it("normalizes mixed casing to Title Case", () => {
    expect(toTitleCase("machine training")).toBe("Machine Training");
    expect(toTitleCase("MACHINE TRAINING")).toBe("Machine Training");
    expect(toTitleCase("mAcHiNe TrAiNiNg")).toBe("Machine Training");
  });

  it("leaves Chinese topic text unchanged", () => {
    expect(toTitleCase("机器培训")).toBe("机器培训");
  });
});

describe("resolveSessionTopics", () => {
  it("title-cases English topic on save and leaves CN as typed", () => {
    expect(resolveSessionTopics("MACHINE TRAINING", "机器培训")).toEqual({
      topicEn: "Machine Training",
      topicCn: "机器培训",
    });
  });

  it("does not title-case a Chinese-only topic used as EN fallback", () => {
    expect(resolveSessionTopics("", "机器培训")).toEqual({
      topicEn: "机器培训",
      topicCn: "机器培训",
    });
  });
});
