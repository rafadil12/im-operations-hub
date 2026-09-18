import { describe, expect, it } from "vitest";
import {
  allocateNextLocationCode,
  LOCATION_CODE_PREFIX,
  parseLocationCodeSuffix,
} from "./locationCode";

describe("parseLocationCodeSuffix", () => {
  it("parses SL + digits", () => {
    expect(parseLocationCodeSuffix("SL001")).toBe(1);
    expect(parseLocationCodeSuffix("sl010")).toBe(10);
    expect(parseLocationCodeSuffix("SL9")).toBe(9);
  });

  it("rejects non-sequence codes", () => {
    expect(parseLocationCodeSuffix("")).toBeNull();
    expect(parseLocationCodeSuffix("SL")).toBeNull();
    expect(parseLocationCodeSuffix("SL001A")).toBeNull();
    expect(parseLocationCodeSuffix("GUDANG_INTERNAL")).toBeNull();
    expect(parseLocationCodeSuffix("SERVER_ROOM")).toBeNull();
  });
});

describe("allocateNextLocationCode", () => {
  it("starts at SL001 when empty", () => {
    expect(allocateNextLocationCode([])).toBe("SL001");
  });

  it("increments from highest valid code", () => {
    expect(allocateNextLocationCode(["SL001", "SL003"])).toBe("SL004");
    expect(allocateNextLocationCode(["SL009"])).toBe("SL010");
    expect(allocateNextLocationCode(["SL099"])).toBe("SL100");
  });

  it("ignores slug-style and invalid codes", () => {
    expect(allocateNextLocationCode(["GUDANG_INTERNAL", "SL002", "LOC"])).toBe("SL003");
  });

  it("uses LOCATION_CODE_PREFIX", () => {
    expect(allocateNextLocationCode([]).startsWith(LOCATION_CODE_PREFIX)).toBe(true);
  });
});
