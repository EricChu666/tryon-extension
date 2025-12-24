// src/content/index.ts
// Entry point for content script: detect product page, inject UI, and handle local parsing routes.
import type { AnyRequestMsg, AnyResponse } from "../shared/messaging";
import { parseAmazonProductPage } from "./amazon/amazonParser";

// TODO Task1/Task2 will replace these imports
// import { parseAmazonProductPage } from "./amazon/amazonParser";
// import { injectTryOnButton } from "./ui/injectTryOnButton";

function ok<T>(data: T): AnyResponse<T> {
    return { ok: true, data };
}
function err(error: string): AnyResponse<any> {
    return { ok: false, error };
}

// MVP: local message handler (from UI components) for product snapshot.
chrome.runtime.onMessage.addListener((msg: AnyRequestMsg, _sender, sendResponse) => {
    (async () => {
        try {
            if (msg.type === "GET_PRODUCT_SNAPSHOT") {
                const snapshot = parseAmazonProductPage(location.href);
                return sendResponse(ok(snapshot));
            }
        } catch (e: any) {
            return sendResponse(err(e?.message ?? "Unknown error"));
        }
    })();

    return true;
});

// Task 2: Inject UI
import { injectTryOnButton } from "./ui/injectTryOnButton";
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectTryOnButton);
} else {
    injectTryOnButton();
}

// console.log("[TryOn MVP] content script loaded");
