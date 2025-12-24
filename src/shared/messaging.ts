// src/shared/messaging.ts
import type {
    ProductSnapshot,
    UserProfile,
    UserAssets,
    UserState,
} from "./types";

export type MsgType =
    | "GET_PRODUCT_SNAPSHOT"
    | "GET_USER_STATE"
    | "SET_USER_PROFILE"
    | "SET_USER_ASSETS"
    | "PING";

export type BaseMsg<T extends MsgType, P> = {
    type: T;
    payload: P;
};

export type PingMsg = BaseMsg<"PING", { atIso: string }>;

export type GetProductSnapshotMsg = BaseMsg<
    "GET_PRODUCT_SNAPSHOT",
    { url: string }
>;

export type GetUserStateMsg = BaseMsg<
    "GET_USER_STATE",
    { reason?: string }
>;

export type SetUserProfileMsg = BaseMsg<
    "SET_USER_PROFILE",
    { profile: UserProfile }
>;

export type SetUserAssetsMsg = BaseMsg<
    "SET_USER_ASSETS",
    { assets: UserAssets }
>;

export type AnyRequestMsg =
    | PingMsg
    | GetProductSnapshotMsg
    | GetUserStateMsg
    | SetUserProfileMsg
    | SetUserAssetsMsg;

// Response envelope (keeps error handling consistent)
export type ResponseOk<T> = { ok: true; data: T };
export type ResponseErr = { ok: false; error: string };

export type AnyResponse<T> =
    | { ok: true; data: T }
    | { ok: false; error: string };


// Response typings per message
export type MsgResponseMap = {
    PING: { pong: true; atIso: string };

    GET_PRODUCT_SNAPSHOT: ProductSnapshot;

    GET_USER_STATE: UserState;

    SET_USER_PROFILE: UserState;

    SET_USER_ASSETS: UserState;
};

// Helper: typed sendMessage from content/ui to background
export async function sendToBackground<T extends MsgType>(
    msg: Extract<AnyRequestMsg, { type: T }>
): Promise<AnyResponse<MsgResponseMap[T]>> {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(msg, (res) => {
            const err = chrome.runtime.lastError?.message;
            if (err) return resolve({ ok: false, error: err });
            resolve(res as AnyResponse<MsgResponseMap[T]>);
        });
    });
}
