import { describe, expect, it } from "vitest";

import { getMessagingContractConfigFromEnv } from "../src/messaging/config.js";
import { MESSAGE_MODULE_DEFAULT } from "../src/messaging/transport.js";

describe("getMessagingContractConfigFromEnv", () => {
  it("returns null when required values are missing", () => {
    expect(getMessagingContractConfigFromEnv({})).toBeNull();
  });

  it("reads values from NEXT_PUBLIC_* keys", () => {
    const cfg = getMessagingContractConfigFromEnv({
      NEXT_PUBLIC_MESSAGE_PACKAGE: "0xpackage",
      NEXT_PUBLIC_MESSAGE_REGISTRY_ID: "0xregistry",
      NEXT_PUBLIC_MESSAGE_REGISTRY_VERSION: "123"
    });

    expect(cfg).toEqual({
      packageId: "0xpackage",
      moduleName: MESSAGE_MODULE_DEFAULT,
      registryId: "0xregistry",
      registryVersion: "123"
    });
  });

  it("uses fallback env keys and custom module name", () => {
    const cfg = getMessagingContractConfigFromEnv({
      MESSAGE_PACKAGE: "0xalt",
      MESSAGE_REGISTRY_ID: "0xreg",
      MESSAGE_REGISTRY_VERSION: "456",
      MESSAGE_MODULE: "custom"
    });

    expect(cfg).toEqual({
      packageId: "0xalt",
      moduleName: "custom",
      registryId: "0xreg",
      registryVersion: "456"
    });
  });
});
