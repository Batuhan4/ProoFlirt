export const DEFAULT_SUI_NETWORK = process.env.NEXT_PUBLIC_SUI_NETWORK || "testnet";

const FULLNODE_URLS: Record<string, string> = {
  localnet: "http://127.0.0.1:9000",
  devnet: "https://fullnode.devnet.sui.io",
  testnet: "https://fullnode.testnet.sui.io",
  mainnet: "https://fullnode.mainnet.sui.io"
};

export function getSuiRpcUrl(network: string = DEFAULT_SUI_NETWORK): string {
  return FULLNODE_URLS[network] || FULLNODE_URLS.testnet;
}

export const GOOGLE_OPENID_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";

export const DEFAULT_REDIRECT_PATH = "/zk/callback";

export const PROVER_SERVICE_URL =
  process.env.NEXT_PUBLIC_ZK_PROVER_URL || "https://prover.mystenlabs.com/v1";
