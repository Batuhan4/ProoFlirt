import { SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import {
  genAddressSeed,
  getZkLoginSignature,
  type ZkLoginSignatureInputs
} from "@mysten/sui/zklogin";

import { fromBase64 } from "@/lib/base64";

import { getSuiRpcUrl } from "./config";
import { loadEphemeralSession, loadSession } from "./storage";

interface ExecuteResult {
  digest: string;
}

export async function executeZkLoginTransaction(tx: Transaction) {
  const session = loadSession();
  if (!session) {
    throw new Error("Connect with zkLogin before submitting this action.");
  }

  const ephemeral = loadEphemeralSession();
  if (!ephemeral) {
    throw new Error("Missing zkLogin ephemeral session. Please log in again.");
  }

  if (!ephemeral.proof) {
    throw new Error("zkLogin proof is still being generated. Please retry in a few seconds.");
  }

  const proofInputs = ephemeral.proof as ZkLoginSignatureInputs;
  if (!proofInputs?.proofPoints) {
    throw new Error("Invalid zkLogin proof payload. Restart the login flow.");
  }

  const client = new SuiClient({ url: getSuiRpcUrl(session.network) });
  const keypair = Ed25519Keypair.fromSecretKey(fromBase64(ephemeral.ephemeralSecretKey));

  const { bytes, signature: userSignature } = await tx.sign({
    client,
    signer: keypair
  });

  const addressSeed = genAddressSeed(session.userSalt, "sub", session.sub, session.aud);

  const zkLoginSignature = getZkLoginSignature({
    inputs: {
      ...proofInputs,
      addressSeed: addressSeed.toString()
    },
    maxEpoch: BigInt(ephemeral.maxEpoch).toString(),
    userSignature
  });

  return client.executeTransactionBlock({
    transactionBlock: bytes,
    signature: zkLoginSignature,
    options: {
      showEffects: true,
      showEvents: true
    },
    requestType: "WaitForLocalExecution"
  }) as Promise<ExecuteResult>;
}
