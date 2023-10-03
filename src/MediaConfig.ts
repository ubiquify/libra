import {
  set as setValue,
  get as getValue,
  setMany as setManyValues,
  clear as clearValues,
  entries as getEntries,
  createStore,
} from "idb-keyval";

export const VERSION_KEY = "mediaSystem.version";
export const APP_NAME_KEY = "mediaSystem.appName";
export const USER_NAME_KEY = "mediaSystem.userName";
export const USER_EMAIL_KEY = "mediaSystem.userEmail";
export const USER_PRIVATE_KEY_KEY = "mediaSystem.userPrivateKey";
export const USER_PUBLIC_KEY_KEY = "mediaSystem.userPublicKey";

export interface Relay {
  name: string;
  url: string;
}

export interface NamedKey {
  name: string;
  key: string;
}

export interface MediaConfig {
  isConfigured: () => Promise<boolean>;
  getVersion: () => Promise<string>;
  setNamedRelays(relays: Relay[]): void;
  getNamedRelay(name: string): Relay;
  getNamedKey(name: string): NamedKey;
  setNamedKeys(keys: NamedKey[]): void;
  listNamedRelays(): Relay[];
  listNamedKeys(): NamedKey[];
  commit(): Promise<void>;
  load(): Promise<void>;
  clearConfig(): Promise<void>;
}

export const mediaConfigFactory = async (): Promise<MediaConfig> => {
  const relayConfigStore = createStore(
    "media-relay-config-store",
    "media-relay-config"
  );

  const keyStore = createStore("media-key-store", "media-keys");

  const configStore = createStore("media-config-store", "media-config");

  const namedRelays = new Map<string, string>();

  const namedKeys = new Map<string, string>();

  const readConfigValue = async (key: string): Promise<string> => {
    return await getValue(key, configStore);
  };
  const saveConfigValue = async (key: string, value: string): Promise<void> => {
    await setValue(key, value, configStore);
  };

  const saveRelays = async (): Promise<void> => {
    await clearValues(relayConfigStore);
    await setManyValues(Array.from(namedRelays.entries()), relayConfigStore);
  };

  const saveKeys = async (): Promise<void> => {
    await clearValues(keyStore);
    await setManyValues(Array.from(namedKeys.entries()), keyStore);
  };

  const readRelays = async (): Promise<void> => {
    const entries = await getEntries(relayConfigStore);
    entries.forEach((entry) => {
      namedRelays.set(entry[0].toString(), entry[1]);
    });
  };

  const readKeys = async (): Promise<void> => {
    const entries = await getEntries(keyStore);
    entries.forEach((entry) => {
      namedKeys.set(entry[0].toString(), entry[1]);
    });
  };

  const commit = async (): Promise<void> => {
    saveRelays();
    saveKeys();
    await saveConfigValue(VERSION_KEY, "1.0.0");
  };

  const load = async (): Promise<void> => {
    namedRelays.clear();
    namedKeys.clear();
    await readRelays();
    await readKeys();
  };

  const clearConfig = async (): Promise<void> => {
    await clearValues(configStore);
    await clearValues(relayConfigStore);
    await clearValues(keyStore);
  };

  const getVersion = async (): Promise<string> => {
    return await readConfigValue(VERSION_KEY);
  };

  const isConfigured = async (): Promise<boolean> => {
    return (await readConfigValue(VERSION_KEY)) !== undefined;
  };

  const setNamedRelays = (relays: Relay[]): void => {
    namedRelays.clear();
    relays.forEach((relay) => {
      namedRelays.set(relay.name, relay.url);
    });
  };

  const setNamedKeys = (keys: NamedKey[]): void => {
    namedKeys.clear();
    keys.forEach((key) => {
      namedKeys.set(key.name, key.key);
    });
  };

  const getNamedRelay = (name: string): Relay => {
    return {
      name: name,
      url: namedRelays.get(name),
    };
  };

  const getNamedKey = (name: string): NamedKey => {
    return {
      name: name,
      key: namedKeys.get(name),
    };
  };

  const listNamedRelays = (): Relay[] => {
    const relays: Relay[] = [];
    namedRelays.forEach((value, key) => {
      relays.push({
        name: key,
        url: value,
      });
    });
    return relays;
  };

  const listNamedKeys = (): NamedKey[] => {
    const keys: NamedKey[] = [];
    namedKeys.forEach((value, key) => {
      keys.push({
        name: key,
        key: value,
      });
    });
    return keys;
  };

  return {
    listNamedRelays,
    listNamedKeys,
    getNamedRelay,
    getNamedKey,
    setNamedRelays,
    setNamedKeys,
    commit,
    load,
    getVersion,
    isConfigured,
    clearConfig,
  };
};
