// src/content/amazon/amazonParser.ts
import type { ProductSnapshot, SizeChart } from "../../shared/types";
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

import type {
    SizeChartMeasurementBasis,
    SizeChartUnit,
    ParsedCell,
    ParsedSizeChartRow
} from "../../shared/types";

function normalizeText(s: string): string {
    return (s || "")
        .replace(/\u00A0/g, " ")       // nbsp
        .replace(/\s+/g, " ")
        .trim();
}

function detectUnitFromHeaders(headers: string[]): SizeChartUnit {
    const h = headers.join(" ").toLowerCase();
    if (h.includes("(in)") || h.includes(" in)") || h.includes(" inches") || h.includes(" inch")) return "in";
    if (h.includes("(cm)") || h.includes(" cm)") || h.includes(" centimeters") || h.includes(" centimetres")) return "cm";
    return "unknown";
}

function detectMeasurementBasis(headers: string[]): SizeChartMeasurementBasis {
    const h = headers.map(x => x.toLowerCase());

    const hasShoulder = h.some(x => x.includes("shoulder"));
    const hasLength = h.some(x => x.includes("length"));
    const hasInseam = h.some(x => x.includes("inseam"));

    // Strong garment signals: body charts rarely include these
    if (hasShoulder || hasLength || hasInseam) return "garment";

    const bodyHints = ["chest", "waist", "hip", "neck", "bust"];
    const garmentHints = ["sleeve", "hem", "pit", "body length", "garment"];

    const bodyScore = bodyHints.reduce((acc, k) => acc + (h.some(x => x.includes(k)) ? 1 : 0), 0);
    const garmentScore = garmentHints.reduce((acc, k) => acc + (h.some(x => x.includes(k)) ? 1 : 0), 0);

    if (garmentScore > bodyScore && garmentScore >= 1) return "garment";
    if (bodyScore > garmentScore && bodyScore >= 1) return "body";
    return "unknown";
}


// Parse numeric cell text like:
// "31 - 32" => {min:31, max:32}
// "13.5"    => {value:13.5}
// "25.5 - 26.5" => {min:25.5, max:26.5}
// Non-numeric remains raw only.
function parseNumericCell(raw: string): ParsedCell {
    const text = normalizeText(raw);
    const nums = text.match(/\d+(\.\d+)?/g)?.map(Number) ?? [];

    const out: ParsedCell = { raw: text };

    if (nums.length === 1) {
        out.value = nums[0];
    } else if (nums.length >= 2) {
        out.min = nums[0];
        out.max = nums[1];
    }
    return out;
}

function parseSizeChartTableFromHtml(rawHtml: string): {
    headers: string[];
    unit: SizeChartUnit;
    measurementBasis: SizeChartMeasurementBasis;
    parsedRows: ParsedSizeChartRow[];
} {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, "text/html");
    const table = doc.querySelector("table");

    if (!table) {
        return { headers: [], unit: "unknown", measurementBasis: "unknown", parsedRows: [] };
    }

    // headers: first row th
    const headerCells = Array.from(table.querySelectorAll("tr:first-child th"));
    const headers = headerCells.map((th) => normalizeText(th.textContent || "")).filter(Boolean);

    const unit = detectUnitFromHeaders(headers);
    const measurementBasis = detectMeasurementBasis(headers);

    const rows: ParsedSizeChartRow[] = [];

    // data rows: subsequent trs
    const trs = Array.from(table.querySelectorAll("tr")).slice(1);
    for (const tr of trs) {
        const row: ParsedSizeChartRow = {};

        // Some size charts use first cell as <th> size label
        const th = tr.querySelector("th");
        if (th) {
            const key = headers[0] || "Size";
            row[key] = { raw: normalizeText(th.textContent || "") };
        }

        const tds = Array.from(tr.querySelectorAll("td"));
        for (let i = 0; i < tds.length; i++) {
            const colName = headers[i + 1] || `col_${i + 1}`;
            const raw = normalizeText(tds[i].textContent || "");
            row[colName] = parseNumericCell(raw);
        }

        // Only keep non-empty rows
        if (Object.keys(row).length > 0) rows.push(row);
    }

    return { headers, unit, measurementBasis, parsedRows: rows };
}


function detectSizeChartMVP(): SizeChart {
    try {
        // Heuristic 1: Any element mentioning "Size chart" or "Size Chart"
        const sizeChartTextNodes = Array.from(document.querySelectorAll("a, button, span, div"))
            .filter((el) => {
                const t = (el as HTMLElement).innerText?.trim().toLowerCase();
                return t === "size chart" || t === "size chart." || t.includes("size chart");
            });

        // Heuristic 2: Look for likely popover/modal areas already in DOM
        // Amazon popovers often live inside `.a-popover-content` or similar nodes.
        const popoverCandidates = Array.from(document.querySelectorAll(".a-popover-content, .a-popover-inner, [role='dialog']"));

        // Heuristic 3: Look for table that seems like a size chart (has headers like size/chest/length/waist etc.)
        const tables = Array.from(document.querySelectorAll("table"));
        const sizeKeywords = ["size", "chest", "bust", "length", "waist", "hip", "shoulder", "sleeve", "inseam", "cm", "inch", "in."];

        const looksLikeSizeChartTable = (table: HTMLTableElement) => {
            const text = (table.innerText || "").toLowerCase();
            const hitCount = sizeKeywords.reduce((acc, k) => acc + (text.includes(k) ? 1 : 0), 0);
            // require at least 2 hits to avoid random spec tables
            return hitCount >= 2 && text.includes("size");
        };

        const tableHit = tables.find((t) => looksLikeSizeChartTable(t as HTMLTableElement)) as HTMLTableElement | undefined;
        if (tableHit) {
            const rawHtml = tableHit.outerHTML;
            const parsed = parseSizeChartTableFromHtml(rawHtml);

            return {
                hasSizeChart: true,
                type: "table",
                rawHtml,
                headers: parsed.headers,
                unit: parsed.unit,
                measurementBasis: parsed.measurementBasis,
                parsedRows: parsed.parsedRows
            };
        }


        // Heuristic 4: size chart image - images with alt/src containing sizechart keywords
        const imgs = Array.from(document.querySelectorAll("img")) as HTMLImageElement[];
        const imgHit = imgs.find((img) => {
            const alt = (img.getAttribute("alt") || "").toLowerCase();
            const src = (img.getAttribute("src") || "").toLowerCase();
            const dataOld = (img.getAttribute("data-old-hires") || "").toLowerCase();
            return (
                alt.includes("size chart") ||
                src.includes("sizechart") ||
                src.includes("size-chart") ||
                dataOld.includes("sizechart") ||
                dataOld.includes("size-chart")
            );
        });

        if (imgHit) {
            const url = imgHit.getAttribute("data-old-hires") || imgHit.src;
            return {
                hasSizeChart: true,
                type: "image",
                imageUrl: url || undefined
            };
        }

        // If we saw "Size chart" text but couldn't locate table/img in DOM, mark unknown but present.
        if (sizeChartTextNodes.length > 0 || popoverCandidates.length > 0) {
            return {
                hasSizeChart: true,
                type: "unknown"
            };
        }

        return { hasSizeChart: false, type: "unknown" };
    } catch {
        return { hasSizeChart: false, type: "unknown" };
    }
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
        let priceRaw = (priceEl as HTMLElement | null)?.innerText?.trim() || "";

        // Fallback: build price from whole + fraction (Amazon often splits them)
        if (!priceRaw) {
            const whole = (document.querySelector(".a-price-whole") as HTMLElement | null)?.innerText?.trim() || "";
            const frac = (document.querySelector(".a-price-fraction") as HTMLElement | null)?.innerText?.trim() || "";
            if (whole) {
                // remove commas/newlines
                const w = whole.replace(/[^\d]/g, "");
                const f = frac.replace(/[^\d]/g, "");
                priceRaw = f ? `$${w}.${f}` : `$${w}`;
            }
        }

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

        // ---- templateMatch (weighted heuristic, 0..1) ----
        // Goal: reflect how confidently we are on a supported Amazon *product detail* page
        // and whether we have enough signals to proceed with downstream try-on steps.

        const hasTitle = !!title && title.length > 3;
        const hasImage = !!mainImgUrl;
        const hasPrice = !!priceRaw && priceRaw.length > 0;
        const hasAsin = !!asin;
        const hasTextInfo = (bulletPoints.length > 0) || (!!descriptionText && descriptionText.trim().length > 0);

        // Approximate "image richness" (more thumbnails often indicates a real PDP with gallery)
        const galleryCount = (gallery?.length ?? 0);
        const hasGallery = galleryCount >= 2;

        // Size chart: MVP currently doesn't parse it, so treat as unknown/false for now.
        // If later you implement detection, replace this with your real value:
        const sizeChart = detectSizeChartMVP();
        const hasSizeChart = !!sizeChart?.hasSizeChart;

        // Weighted score (sum of weights = 1.0)
        const WEIGHTS = {
            title: 0.25,
            image: 0.25,
            price: 0.10,
            asin: 0.10,
            textInfo: 0.10,
            gallery: 0.10,
            sizeChart: 0.10
        } as const;

        let templateMatchScore = 0;
        templateMatchScore += hasTitle ? WEIGHTS.title : 0;
        templateMatchScore += hasImage ? WEIGHTS.image : 0;
        templateMatchScore += hasPrice ? WEIGHTS.price : 0;
        templateMatchScore += hasAsin ? WEIGHTS.asin : 0;
        templateMatchScore += hasTextInfo ? WEIGHTS.textInfo : 0;
        templateMatchScore += hasGallery ? WEIGHTS.gallery : 0;
        templateMatchScore += hasSizeChart ? WEIGHTS.sizeChart : 0;

        // Clamp to [0, 1]
        const templateMatch = Math.max(0, Math.min(1, templateMatchScore));

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
            sizeChart,
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
