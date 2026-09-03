// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { getStoredClientProfile, getStoredPhoneVerification, saveClientProfile, savePhoneVerification } from "./storage";

afterEach(() => window.localStorage.clear());

describe("client profile phone storage", () => {
  it("keeps a verified state only while the locally saved phone is unchanged", () => {
    savePhoneVerification("31999999999", 2);
    expect(getStoredPhoneVerification()?.phone).toBe("31999999999");

    saveClientProfile({ name: "Maria" });
    expect(getStoredPhoneVerification()?.phone).toBe("31999999999");

    saveClientProfile({ phone: "31988888888" });
    expect(getStoredPhoneVerification()).toBeNull();
    expect(getStoredClientProfile()?.phone).toBe("31988888888");
    expect(getStoredClientProfile()?.phoneVerifiedAt).toBeUndefined();
    expect(getStoredClientProfile()?.recoveredCount).toBeUndefined();
  });
});
