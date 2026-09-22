import { describe, expect, it } from "vitest";
import { normalizeTopicText, renderTopicText, resolveSessionTopics } from "./topicText";

describe("renderTopicText", () => {
  it("renders typed text as ALL CAPS without trimming while typing", () => {
    expect(renderTopicText("machine training")).toBe("MACHINE TRAINING");
    expect(renderTopicText("mAcHiNe ")).toBe("MACHINE ");
  });
});

describe("normalizeTopicText", () => {
  it("normalizes mixed casing to ALL CAPS", () => {
    expect(normalizeTopicText("machine training")).toBe("MACHINE TRAINING");
    expect(normalizeTopicText("MACHINE TRAINING")).toBe("MACHINE TRAINING");
    expect(normalizeTopicText("mAcHiNe TrAiNiNg")).toBe("MACHINE TRAINING");
  });

  it("leaves Chinese topic text unchanged", () => {
    expect(normalizeTopicText("机器培训")).toBe("机器培训");
  });
});

describe("resolveSessionTopics", () => {
  it("uppercases English topic on save and leaves Chinese glyphs unchanged", () => {
    expect(resolveSessionTopics("machine training", "机器培训")).toEqual({
      topicEn: "MACHINE TRAINING",
      topicCn: "机器培训",
    });
  });

  it("does not alter a Chinese-only topic used as EN fallback", () => {
    expect(resolveSessionTopics("", "机器培训")).toEqual({
      topicEn: "机器培训",
      topicCn: "机器培训",
    });
  });
});
