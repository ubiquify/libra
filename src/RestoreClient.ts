import { BlockStore, Block } from "@ubiquify/core";
import axios, {
  AxiosInstance,
  AxiosError,
  AxiosResponse,
  CreateAxiosDefaults,
} from "axios";

export interface RestoreBlockStore extends BlockStore {
  clear: () => Promise<void>;
  cids: () => Promise<string[]>;
}

export const createRestoreBlockStore = (
  config: CreateAxiosDefaults<any>,
  cache: any
): RestoreBlockStore => {
  const httpClient: AxiosInstance = axios.create(config);

  async function put(block: Block): Promise<void> {
    console.log(
      `putting block: ${block.cid.toString()}, len: ${
        // truncated to 2 decimal places
        Math.round((block.bytes.byteLength / 1024) * 100) / 100
      }KB`
    );
    // console.log("bytes ", block.bytes);
    return await putRemote(block);
  }

  async function get(cid: any): Promise<Uint8Array> {
    let bytes: Uint8Array | undefined;
    if (cache) bytes = cache[cid.toString()];
    if (!bytes) {
      bytes = await getRemote(cid);
      if (cache) cache[cid.toString()] = bytes;
    }
    return bytes;
  }

  function toBuffer(array: Uint8Array): ArrayBuffer {
    return array.buffer.slice(
      array.byteOffset,
      array.byteLength + array.byteOffset
    );
  }
  async function putRemote(block: Block): Promise<void> {
    const dataArray = toBuffer(block.bytes);
    return await httpClient.put(`/blocks/${block.cid.toString()}`, dataArray, {
      headers: {
        "Content-Type": "application/octet-stream",
      },
    });
  }

  async function getRemote(cid: any): Promise<Uint8Array> {
    const response: AxiosResponse<ArrayBuffer> = await httpClient.get(
      `/blocks/${cid.toString()}`,
      {
        responseType: "arraybuffer",
      }
    );
    if (response.data) {
      return new Uint8Array(response.data);
    } else {
      throw new Error(`Block not found, CID: ${cid.toString()}`);
    }
  }

  async function clear(): Promise<void> {
    return await httpClient.delete(`/blocks`);
  }

  async function cids(): Promise<string[]> {
    const start = "0";
    const end = "z";
    const limit = 100;
    const response: AxiosResponse<Array<string>> = await httpClient.get(
      `/cids?start=${0}&end=${end}&limit=${limit}`
    );
    if (response.data) {
      return response.data;
    } else {
      return [];
    }
  }

  return {
    put,
    get,
    clear,
    cids,
  };
};
