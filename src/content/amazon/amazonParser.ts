// src/content/amazon/amazonParser.ts
import type { ProductSnapshot } from "../../shared/types";
import { AMAZON_SELECTORS } from "./selectors.amazon";

function firstEl(selectors: readonly string[]): Element | null {
    for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) return el;
    }
    return null;
}

function allText(selectors: readonly string[]): string[] {
    const out: string[] = [];
    for (const sel of selectors) {
        document.querySelectorAll(sel).forEach((n) => {
            const t = (n as HTMLElement).innerText?.trim();
            if (t) out.push(t);
        });
        if (out.length) break;
    }
    return out;
}

function getAttr(el: Element | null, attr: string): string | undefined {
    if (!el) return undefined;
    const v = el.getAttribute(attr);
    return v ? v : undefined;
}

function parseAsinFromUrl(url: string): string | undefined {
    const m1 = url.match(/\/dp\/([A-Z0-9]{10})/i);
    if (m1?.[1]) return m1[1].toUpperCase();
    const m2 = url.match(/\/gp\/product\/([A-Z0-9]{10})/i);
    if (m2?.[1]) return m2[1].toUpperCase();
    return undefined;
}

function detectFitKeywords(text: string) {
    const lower = text.toLowerCase();
    const hits: string[] = [];
    const rules: Array<[string, string[]]> = [
        ["oversized", ["oversized", "relaxed fit", "loose fit", "baggy"]],
        ["slim", ["slim fit"]],
        ["regular", ["regular fit"]]
    ];

    let isOversized = false;
    let isSlim = false;
    let isRegular = false;

    for (const [tag, phrases] of rules) {
        for (const p of phrases) {
            if (lower.includes(p)) {
                hits.push(p);
                if (tag === "oversized") isOversized = true;
                if (tag === "slim") isSlim = true;
                if (tag === "regular") isRegular = true;
            }
        }
    }

    // default to regular if nothing matched
    if (!isOversized && !isSlim && !isRegular) isRegular = true;

    return { isOversized, isSlim, isRegular, rawHits: hits };
}

function guessCategory(text: string): "tshirt" | "hoodie" | "unknown" {
    const lower = text.toLowerCase();
    if (/(hoodie|pullover hoodie|sweatshirt)/.test(lower)) return "hoodie";
    if (/(t-shirt|tshirt|tee|t shirt|shirt)/.test(lower)) return "tshirt";
    return "unknown";
}

export function parseAmazonProductPage(url: string = location.href): ProductSnapshot {
    const capturedAtIso = new Date().toISOString();

    try {
        const asin = parseAsinFromUrl(url);

        const titleEl = firstEl(AMAZON_SELECTORS.title);
        const title = (titleEl as HTMLElement | null)?.innerText?.trim();

        const brandEl = firstEl(AMAZON_SELECTORS.brand);
        const brand = (brandEl as HTMLElement | null)?.innerText?.trim();

        const priceEl = firstEl(AMAZON_SELECTORS.price);
        const priceRaw = (priceEl as HTMLElement | null)?.innerText?.trim();

        const mainImgEl = firstEl(AMAZON_SELECTORS.imageMain);
        const mainImgUrl =
            getAttr(mainImgEl, "src") ??
            getAttr(mainImgEl, "data-old-hires") ??
            getAttr(mainImgEl, "data-a-dynamic-image");

        const bulletPoints = allText(AMAZON_SELECTORS.bulletPoints);

        const descEl = firstEl(AMAZON_SELECTORS.description);
        const descriptionText = (descEl as HTMLElement | null)?.innerText?.trim() ?? "";

        // gallery (best-effort)
        const gallery: string[] = [];
        document.querySelectorAll(AMAZON_SELECTORS.imageThumbs[0]).forEach((img) => {
            const src = (img as HTMLImageElement).src;
            if (src) gallery.push(src);
        });

        const combinedText = [title, brand, priceRaw, bulletPoints.join(" "), descriptionText]
            .filter(Boolean)
            .join(" ");

        const fitKeywords = detectFitKeywords(combinedText);
        const categoryGuess = guessCategory(combinedText);

        // confidence heuristics
        const hasTitle = !!title;
        const hasImage = !!mainImgUrl;
        const templateMatch = hasTitle && hasImage ? 0.9 : hasTitle || hasImage ? 0.6 : 0.2;

        const keyFields = [hasTitle, hasImage, !!priceRaw, bulletPoints.length > 0 || !!descriptionText];
        const dataCompleteness = keyFields.filter(Boolean).length / keyFields.length;

        const snapshot: ProductSnapshot = {
            source: "amazon",
            url,
            asin,
            title,
            brand,
            categoryGuess,
            price: { raw: priceRaw },
            primaryImage: mainImgUrl ? { url: mainImgUrl, alt: title } : undefined,
            imageGallery: gallery,
            bulletPoints,
            descriptionText,
            fitKeywords,
            modelInfo: { hasModelInfo: false, rawText: "" }, // MVP: later
            sizeChart: { hasSizeChart: false, type: "unknown" }, // MVP: later
            confidence: { templateMatch, dataCompleteness },
            capturedAtIso
        };

        // debug hook
        if (new URL(url).searchParams.get("tryon_debug") === "1") {
            (window as any).__TRYON_PRODUCT__ = snapshot;
            console.log("[TryOn MVP][Parser]", snapshot);
        }

        return snapshot;
    } catch (e: any) {
        const fallback: ProductSnapshot = {
            source: "amazon",
            url,
            asin: parseAsinFromUrl(url),
            categoryGuess: "unknown",
            imageGallery: [],
            bulletPoints: [],
            descriptionText: "",
            fitKeywords: { isOversized: false, isSlim: false, isRegular: true, rawHits: [] },
            modelInfo: { hasModelInfo: false, rawText: "" },
            sizeChart: { hasSizeChart: false, type: "unknown" },
            confidence: { templateMatch: 0.2, dataCompleteness: 0.2 },
            capturedAtIso
        };
        console.warn("[TryOn MVP][Parser] fallback due to error:", e?.message ?? e);
        return fallback;
    }
}
