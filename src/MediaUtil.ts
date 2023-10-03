import { Signer, signerFactory } from "@ubiquify/core";
import {
  MediaConfig,
  USER_EMAIL_KEY,
  USER_NAME_KEY,
  USER_PRIVATE_KEY_KEY,
  USER_PUBLIC_KEY_KEY,
} from "./MediaConfig";

const { subtle } = window.crypto;

export interface CommitUtil {
  createCommitInfo: ({
    comment,
    tags,
  }: {
    comment?: string;
    tags?: string[];
  }) => CommitInfo;
}

export interface CommitInfo {
  comment?: string;
  tags?: string[];
  signer?: Signer;
}

export interface CryptoUtil {
  generateSignatureKeys: () => Promise<{
    publicKey: CryptoKey;
    privateKey: CryptoKey;
  }>;
  exportSignatureKey: (key: CryptoKey) => Promise<JsonWebKey>;
  importPrivateKey: (key: JsonWebKey) => Promise<CryptoKey>;
  importPublicKey: (key: JsonWebKey) => Promise<CryptoKey>;
}

export const commitUtilFactory = async (
  config: MediaConfig
): Promise<CommitUtil> => {
  const privateKeyJWT = config.getNamedKey(USER_PRIVATE_KEY_KEY);
  const publicKeyJWT = config.getNamedKey(USER_PUBLIC_KEY_KEY);
  let signer: Signer | undefined = undefined;
  if (privateKeyJWT !== undefined && publicKeyJWT !== undefined) {
    const cryptoUtility = cryptoUtil();
    const publicKey = await cryptoUtility.importPublicKey(
      JSON.parse(publicKeyJWT.key)
    );
    const privateKey = await cryptoUtility.importPrivateKey(
      JSON.parse(privateKeyJWT.key)
    );
    const nameNamedKey = config.getNamedKey(USER_NAME_KEY);
    const name = nameNamedKey !== undefined ? nameNamedKey.key : undefined;
    const emailNamedKey = config.getNamedKey(USER_EMAIL_KEY);
    const email = emailNamedKey !== undefined ? emailNamedKey.key : undefined;
    signer = signerFactory({ name, email, subtle, privateKey, publicKey });
  }

  const createCommitInfo = ({
    comment,
    tags,
  }: {
    comment?: string;
    tags?: string[];
  }) => {
    return {
      comment,
      tags,
      signer,
    };
  };
  return {
    createCommitInfo,
  };
};
export const cryptoUtil = (): CryptoUtil => {
  const generateSignatureKeys = async (): Promise<{
    publicKey: CryptoKey;
    privateKey: CryptoKey;
  }> => {
    const { publicKey, privateKey } = await subtle.generateKey(
      {
        name: "RSA-PSS",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["sign", "verify"]
    );
    return { publicKey, privateKey };
  };

  const exportSignatureKey = async (key: CryptoKey): Promise<JsonWebKey> => {
    const exported = await subtle.exportKey("jwk", key);
    return exported;
  };

  const importPublicKey = async (key: JsonWebKey): Promise<CryptoKey> => {
    const imported = await subtle.importKey(
      "jwk",
      key,
      { name: "RSA-PSS", hash: "SHA-256" },
      true,
      ["verify"]
    );
    return imported;
  };
  const importPrivateKey = async (key: JsonWebKey): Promise<CryptoKey> => {
    const imported = await subtle.importKey(
      "jwk",
      key,
      { name: "RSA-PSS", hash: "SHA-256" },
      true,
      ["sign"]
    );
    return imported;
  };

  return {
    generateSignatureKeys,
    exportSignatureKey,
    importPublicKey,
    importPrivateKey,
  };
};

export const arrayBufferToURL = (
  binaryData: ArrayBuffer,
  mediaType: string
): string => {
  const uint8 = new Uint8Array(binaryData as ArrayBuffer);
  return uint8ArrayToURL(uint8, mediaType);
};

export const uint8ArrayToURL = (
  uint8: Uint8Array,
  mediaType: string
): string => {
  const blob = new Blob([uint8], { type: mediaType });
  const url = URL.createObjectURL(blob);
  return url;
};

export const displayCollection = (alias: string) => {
  const protocol = window.location.protocol;
  const host = window.location.host;
  window.location.assign(`${protocol}//${host}${alias}`);
};

export const setDisplayInfo = (
  fileData: ArrayBuffer,
  mimeType: string,
  render: (data: string) => void
) => {
  let displayInfo: string | undefined = undefined;
  if (mimeType === "text/plain") {
    displayInfo = new TextDecoder().decode(fileData);
  } else if (mimeType === "text/html") {
    displayInfo = new TextDecoder().decode(fileData);
  } else {
    displayInfo = arrayBufferToURL(fileData, mimeType);
  }
  render(displayInfo);
};

export const groupByKey = (list: any[], key: string | number) =>
  list.reduce(
    (hash, obj) => ({
      ...hash,
      [obj[key]]: (hash[obj[key]] || []).concat(obj),
    }),
    {}
  );
