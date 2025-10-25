import { Transaction } from "@mysten/sui/transactions";

interface MediaRecordPayload {
  walrusLink: string;
  mimeType: string;
  fileHash: Uint8Array;
}

export interface CreateProfilePayload {
  sender: string;
  displayName: string;
  bio: string;
  interests: string[];
  identityHash: Uint8Array;
  zkCommitment: Uint8Array;
  primary: MediaRecordPayload;
  gallery: MediaRecordPayload[];
  compatibilityScore: number;
  trustScore: number;
}

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing ${name}. Please configure it in .env.local`);
  }
  return value;
}

const PROFILE_PACKAGE = requireEnv(
  "NEXT_PUBLIC_PROFILE_PACKAGE",
  process.env.NEXT_PUBLIC_PROFILE_PACKAGE
);
const PROFILE_MODULE = "profile";
const PROFILE_REGISTRY_ID = requireEnv(
  "NEXT_PUBLIC_PROFILE_REGISTRY_ID",
  process.env.NEXT_PUBLIC_PROFILE_REGISTRY_ID
);
const PROFILE_REGISTRY_VERSION = Number(
  requireEnv(
    "NEXT_PUBLIC_PROFILE_REGISTRY_VERSION",
    process.env.NEXT_PUBLIC_PROFILE_REGISTRY_VERSION
  )
);

function mediaRecordTx(tx: Transaction, media: MediaRecordPayload) {
  return tx.moveCall({
    target: `${PROFILE_PACKAGE}::${PROFILE_MODULE}::new_media_record`,
    arguments: [
      tx.pure.string(media.walrusLink),
      tx.pure.string(media.mimeType || "application/octet-stream"),
      tx.pure.vector("u8", Array.from(media.fileHash))
    ]
  });
}

export function buildCreateProfileTransaction(payload: CreateProfilePayload) {
  const tx = new Transaction();
  tx.setSenderIfNotSet(payload.sender);

  const registry = tx.sharedObjectRef({
    objectId: PROFILE_REGISTRY_ID,
    initialSharedVersion: PROFILE_REGISTRY_VERSION,
    mutable: true
  });

  const primaryRecord = mediaRecordTx(tx, payload.primary);
  const galleryRecords = payload.gallery.map((item) => mediaRecordTx(tx, item));

  tx.moveCall({
    target: `${PROFILE_PACKAGE}::${PROFILE_MODULE}::create_profile`,
    arguments: [
      registry,
      tx.pure.string(payload.displayName),
      tx.pure.string(payload.bio),
      tx.pure.vector("string", payload.interests),
      tx.pure.vector("u8", Array.from(payload.identityHash)),
      tx.pure.vector("u8", Array.from(payload.zkCommitment)),
      primaryRecord,
      tx.makeMoveVec({
        type: `${PROFILE_PACKAGE}::${PROFILE_MODULE}::MediaRecord`,
        elements: galleryRecords
      }),
      tx.pure.u64(BigInt(payload.compatibilityScore)),
      tx.pure.u64(BigInt(payload.trustScore))
    ]
  });

  tx.setGasBudgetIfNotSet(BigInt(10_000_000));

  return tx;
}

export type { MediaRecordPayload };
