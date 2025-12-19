// src/background/index.ts
import { getUserState, setUserAssets, setUserProfile } from "../shared/storage";
import type { AnyRequestMsg, AnyResponse } from "../shared/messaging";
import type { ProductSnapshot } from "../shared/types";

// NOTE: Task1 will provide the real parser in content script.
// Background mostly handles storage + any CORS-safe fetching later.

function ok<T>(data: T): AnyResponse<T> {
    return { ok: true, data };
}
function err(error: string): AnyResponse<any> {
    return { ok: false, error };
}

chrome.runtime.onMessage.addListener((msg: AnyRequestMsg, _sender, sendResponse) => {
    (async () => {
        try {
            switch (msg.type) {
                case "PING":
                    return sendResponse(ok({ pong: true, atIso: new Date().toISOString() }));

                case "GET_USER_STATE":
                    return sendResponse(ok(await getUserState()));

                case "SET_USER_PROFILE":
                    return sendResponse(ok(await setUserProfile(msg.payload.profile)));

                case "SET_USER_ASSETS":
                    return sendResponse(ok(await setUserAssets(msg.payload.assets)));

                // For MVP we don't parse in background. Content script will parse locally.
                // We keep this route for future, but return error for now.
                case "GET_PRODUCT_SNAPSHOT": {
                    const tabId = _sender?.tab?.id;
                    if (!tabId) {
                        return sendResponse(err("No sender tabId. Open an Amazon product page and run this from the content script context."));
                    }

                    chrome.tabs.sendMessage(tabId, msg, (res) => {
                        const lastErr = chrome.runtime.lastError?.message;
                        if (lastErr) return sendResponse(err(lastErr));
                        // res should already be { ok: true/false, data/error } from content script
                        return sendResponse(res);
                    });

                    return; // important: response is async
                }

            }
        } catch (e: any) {
            return sendResponse(err(e?.message ?? "Unknown error"));
        }
    })();

    return true; // async response
});
