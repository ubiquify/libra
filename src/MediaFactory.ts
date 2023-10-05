import { compute_chunks } from "@dstanesc/wasm-chunking-fastcdc-webpack";
import {
  Block,
  BlockStore,
  LinkCodec,
  ValueCodec,
  VersionStore,
  chunkerFactory,
  graphStoreFactory,
  linkCodecFactory,
  valueCodecFactory,
  versionStoreFactory,
} from "@ubiquify/core";
import {
  CHUNK_SIZE_DEFAULT,
  MediaNode,
  MediaCollection,
  MediaSystem,
  mediaSystemFactory,
  mediaCollectionFactory,
  ContentAddressable,
  NamedMediaCollection,
  importMediaCollectionComplete,
  pullMediaCollection as pullCollection,
  createMediaSystemViewCurrent,
  MediaSystemView,
} from "@ubiquify/media";

import { BasicPushResponse } from "@ubiquify/cyclone";
import {
  blockStoreFactory as browserBlockStore,
  BrowserBlockStore,
} from "@ubiquify/weblock";

import { set, get, createStore, clear } from "idb-keyval";
import { CommitInfo } from "./MediaUtil";
const cache = {};
const blockStore: BrowserBlockStore = browserBlockStore({ cache });
const { chunk } = chunkerFactory(CHUNK_SIZE_DEFAULT, compute_chunks);
const linkCodec: LinkCodec = linkCodecFactory();
const valueCodec: ValueCodec = valueCodecFactory();
const MEDIA_SYSTEM_ROOT = "mediaSystem.root";

const newMediaCollection = async (
  blockStore: BlockStore
): Promise<MediaCollection> => {
  const versionStore: VersionStore = await versionStoreFactory({
    chunk,
    linkCodec,
    valueCodec,
    blockStore,
  });
  const graphStore = graphStoreFactory({
    chunk,
    linkCodec,
    valueCodec,
    blockStore,
  });
  return mediaCollectionFactory(versionStore, graphStore, {
    chunk,
    chunkSize: CHUNK_SIZE_DEFAULT,
    linkCodec,
    valueCodec,
    blockStore,
  });
};

const newNamedMediaCollection = async (
  alias: string,
  blockStore: BlockStore
): Promise<NamedMediaCollection> => {
  const mediaCollection = await newMediaCollection(blockStore);
  return {
    name: alias,
    ...mediaCollection,
  };
};

const newMediaSystem = async (
  blockStore: BlockStore,
  getRoot: () => Promise<string>
): Promise<MediaSystem> => {
  const mediaSystemRoot = await getRoot();

  const versionStore: VersionStore = await versionStoreFactory({
    storeRoot:
      mediaSystemRoot !== undefined
        ? linkCodec.parseString(mediaSystemRoot)
        : undefined,
    chunk,
    linkCodec,
    valueCodec,
    blockStore,
  });

  const graphStore = graphStoreFactory({
    chunk,
    linkCodec,
    valueCodec,
    blockStore,
  });
  return mediaSystemFactory(versionStore, graphStore, {
    chunk,
    chunkSize: CHUNK_SIZE_DEFAULT,
    linkCodec,
    valueCodec,
    blockStore,
  });
};

export interface MediaSink {
  (fn: (mediaNodes: MediaNode[]) => MediaNode[]): void;
}

export interface MediaFactory {
  currentMediaCollectionByAlias: (
    alias: string
  ) => Promise<NamedMediaCollection>;
  exportMediaCollection: (alias: string) => Promise<Block>;
  importMediaCollection: (
    alias: string,
    mediaCollection: MediaCollection
  ) => Promise<NamedMediaCollection>;
  listMediaCollections: () => NamedMediaCollection[];
  readMediaCollectionFromBundle: (
    bundle: Uint8Array
  ) => Promise<MediaCollection>;
  addMediaCollection: (alias: string, mediaNodes: MediaNode[]) => Promise<void>;
  loadMediaCollection: (alias: string) => Promise<MediaNode[]>;
  loadMediaCollectionIncremental: (
    alias: string,
    setProgress: (percent: number) => void,
    sink: MediaSink
  ) => Promise<void>;
  commitMediaCollection: (
    alias: string,
    commitInfo: CommitInfo
  ) => Promise<ContentAddressable>;
  commitMediaSystem: (commitInfo: CommitInfo) => Promise<ContentAddressable>;
  pushMediaCollectionByAlias: ({
    relayUrl,
    alias,
  }: {
    relayUrl: string;
    alias: string;
  }) => Promise<BasicPushResponse>;
  pullMediaCollectionByAlias: ({
    relayUrl,
    alias,
  }: {
    relayUrl: string;
    alias: string;
  }) => Promise<MediaCollection>;
  checkUpdatesByAlias: ({
    relayUrl,
    alias,
  }: {
    relayUrl: string;
    alias: string;
  }) => Promise<boolean>;
  pullMediaCollectionByIdentifier: ({
    relayUrl,
    versionStoreId,
  }: {
    relayUrl: string;
    versionStoreId: string;
  }) => Promise<MediaCollection | undefined>;
  clearRoot: () => Promise<void>;
  clearBlocks: () => Promise<void>;
}

export const mediaFactoryBuilder = async (): Promise<MediaFactory> => {
  const rootStore = createStore("media-root-store", "media-root");

  const getRoot = async (): Promise<string> => {
    return await get(MEDIA_SYSTEM_ROOT, rootStore);
  };

  const setRoot = async (value: string): Promise<void> => {
    await set(MEDIA_SYSTEM_ROOT, value, rootStore);
  };

  const clearRoot = async (): Promise<void> => {
    await clear(rootStore);
  };

  const clearBlocks = async (): Promise<void> => {
    await blockStore.clear();
  };

  const mediaSystem: MediaSystem = await newMediaSystem(blockStore, getRoot);

  const currentMediaSystemView: MediaSystemView =
    await createMediaSystemViewCurrent(mediaSystem);

  const currentMediaCollectionByAlias = async (
    alias: string
  ): Promise<NamedMediaCollection> => {
    return await currentMediaSystemView.getByName(alias);
  };

  const ensureCurrentMediaCollectionByAlias = async (
    alias: string
  ): Promise<NamedMediaCollection> => {
    const mediaCollection = await currentMediaSystemView.getByName(alias);
    if (mediaCollection === undefined) {
      const namedMediaCollection = await newNamedMediaCollection(
        alias,
        blockStore
      );
      currentMediaSystemView.add(alias, namedMediaCollection);
      return namedMediaCollection;
    } else {
      return mediaCollection;
    }
  };

  const addMediaCollection = async (alias: string, mediaNodes: MediaNode[]) => {
    const mediaCollection: NamedMediaCollection =
      await ensureCurrentMediaCollectionByAlias(alias);
    mediaNodes.forEach((mediaNode: MediaNode) => {
      mediaCollection.add(mediaNode);
    });
  };

  const loadMediaCollection = async (alias: string): Promise<MediaNode[]> => {
    const mediaCollection: NamedMediaCollection =
      await ensureCurrentMediaCollectionByAlias(alias);
    const mediaNodes: MediaNode[] = await mediaCollection.load({});
    return mediaNodes;
  };

  const loadMediaCollectionIncremental = async (
    alias: string,
    setProgress: (percent: number) => void,
    sink: MediaSink
  ): Promise<void> => {
    const mediaCollection: NamedMediaCollection =
      await ensureCurrentMediaCollectionByAlias(alias);
    const length = await mediaCollection.persistedSize();
    let startIndex = 0;
    const itemCount = 1;
    let increment =
      startIndex + itemCount > length ? length - startIndex : itemCount;
    while (startIndex < length) {
      const mediaNodes: MediaNode[] = await mediaCollection.load({
        startIndex,
        itemCount,
      });
      increment =
        startIndex + itemCount > length ? length - startIndex : itemCount;
      startIndex += increment;
      sink((prevNodes) => [...prevNodes, ...mediaNodes]);
      setProgress(Math.round((startIndex / length) * 100));
    }
  };
  const commitMediaCollection = async (
    alias: string,
    commitInfo: CommitInfo
  ): Promise<ContentAddressable> => {
    const mediaCollection: NamedMediaCollection =
      await ensureCurrentMediaCollectionByAlias(alias);
    await mediaCollection.commit(commitInfo);
    return {
      getVersionStore: mediaCollection.getVersionStore,
      versionStoreRoot: mediaCollection.versionStoreRoot,
      versionStoreId: mediaCollection.versionStoreId,
      currentRoot: mediaCollection.currentRoot,
      verify: mediaCollection.verify,
    };
  };

  const commitMediaSystem = async (
    commitInfo: CommitInfo
  ): Promise<ContentAddressable> => {
    const { versionStoreRoot } = await mediaSystem.commit(commitInfo);
    await setRoot(linkCodec.encodeString(versionStoreRoot));
    return {
      getVersionStore: mediaSystem.getVersionStore,
      versionStoreRoot: mediaSystem.versionStoreRoot,
      versionStoreId: mediaSystem.versionStoreId,
      currentRoot: mediaSystem.currentRoot,
      verify: mediaSystem.verify,
    };
  };

  const exportMediaCollection = async (alias: string): Promise<Block> => {
    const mediaCollection: NamedMediaCollection =
      await ensureCurrentMediaCollectionByAlias(alias);
    const bundle = mediaCollection.exportComplete();
    return bundle;
  };

  const readMediaCollectionFromBundle = async (
    bundle: Uint8Array
  ): Promise<MediaCollection> => {
    const mediaCollection = await importMediaCollectionComplete(bundle, {
      chunk,
      chunkSize: CHUNK_SIZE_DEFAULT,
      linkCodec,
      valueCodec,
      blockStore,
    });
    return mediaCollection;
  };

  const importMediaCollection = async (
    alias: string,
    mediaCollection: MediaCollection
  ): Promise<NamedMediaCollection> => {
    const namedMediaCollection = {
      name: alias,
      ...mediaCollection,
    };
    mediaSystem.add(namedMediaCollection);
    return namedMediaCollection;
  };

  const listMediaCollections = (): NamedMediaCollection[] => {
    const mediaCollections: NamedMediaCollection[] = mediaSystem.valuesLoaded();
    return mediaCollections;
  };

  const pushMediaCollectionByAlias = async ({
    relayUrl,
    alias,
  }: {
    relayUrl: string;
    alias: string;
  }): Promise<BasicPushResponse> => {
    const mediaCollection: NamedMediaCollection =
      await ensureCurrentMediaCollectionByAlias(alias);
    const response = await mediaCollection.push(relayUrl);
    return response;
  };

  const pullMediaCollectionByAlias = async ({
    relayUrl,
    alias,
  }: {
    relayUrl: string;
    alias: string;
  }): Promise<MediaCollection> => {
    const mediaCollection: NamedMediaCollection =
      await ensureCurrentMediaCollectionByAlias(alias);
    await mediaCollection.pull(relayUrl);
    return mediaCollection;
  };

  const checkUpdatesByAlias = async ({
    relayUrl,
    alias,
  }: {
    relayUrl: string;
    alias: string;
  }): Promise<boolean> => {
    const response = await mediaSystem.areRemoteUpdatesForLoadedCollection({
      relayUrl,
      name: alias,
    });
    return response;
  };

  const pullMediaCollectionByIdentifier = async ({
    relayUrl,
    versionStoreId,
  }: {
    relayUrl: string;
    versionStoreId: string;
  }): Promise<MediaCollection | undefined> => {
    const mediaCollection = await pullCollection(relayUrl, versionStoreId, {
      chunk,
      chunkSize: CHUNK_SIZE_DEFAULT,
      linkCodec,
      valueCodec,
      blockStore,
    });
    return mediaCollection;
  };

  return {
    currentMediaCollectionByAlias,
    exportMediaCollection,
    importMediaCollection,
    pushMediaCollectionByAlias,
    pullMediaCollectionByAlias,
    checkUpdatesByAlias,
    pullMediaCollectionByIdentifier,
    readMediaCollectionFromBundle,
    listMediaCollections,
    addMediaCollection,
    loadMediaCollection,
    loadMediaCollectionIncremental,
    commitMediaCollection,
    commitMediaSystem,
    clearRoot,
    clearBlocks,
  };
};
