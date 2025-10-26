import { MESSAGE_MODULE_DEFAULT } from "./transport.js";

export interface MessagingContractConfig {
  packageId: string;
  moduleName: string;
  registryId: string;
  registryVersion?: string;
}

const PACKAGE_ENV_KEYS = [
  "NEXT_PUBLIC_MESSAGE_PACKAGE",
  "MESSAGE_PACKAGE",
  "PROOFLIRT_MESSAGE_PACKAGE"
] as const;

const REGISTRY_ID_ENV_KEYS = [
  "NEXT_PUBLIC_MESSAGE_REGISTRY_ID",
  "MESSAGE_REGISTRY_ID",
  "PROOFLIRT_MESSAGE_REGISTRY_ID"
] as const;

const REGISTRY_VERSION_ENV_KEYS = [
  "NEXT_PUBLIC_MESSAGE_REGISTRY_VERSION",
  "MESSAGE_REGISTRY_VERSION",
  "PROOFLIRT_MESSAGE_REGISTRY_VERSION"
] as const;

const MODULE_ENV_KEYS = [
  "NEXT_PUBLIC_MESSAGE_MODULE",
  "MESSAGE_MODULE"
] as const;

export function getMessagingContractConfigFromEnv(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>
): MessagingContractConfig | null {
  const packageId = firstDefined(env, PACKAGE_ENV_KEYS);
  const registryId = firstDefined(env, REGISTRY_ID_ENV_KEYS);
  if (!packageId || !registryId) {
    return null;
  }

  const moduleName = firstDefined(env, MODULE_ENV_KEYS) ?? MESSAGE_MODULE_DEFAULT;
  const registryVersion = firstDefined(env, REGISTRY_VERSION_ENV_KEYS) ?? undefined;

  return {
    packageId,
    moduleName,
    registryId,
    registryVersion
  };
}

function firstDefined(
  env: Record<string, string | undefined>,
  keys: readonly string[]
): string | undefined {
  for (const key of keys) {
    const value = env[key];
    if (value && value.length > 0) {
      return value;
    }
  }
  return undefined;
}
