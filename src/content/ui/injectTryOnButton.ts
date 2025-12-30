import { STYLES } from "./styles";
import type { ProductSnapshot, ParsedSizeChartRow } from "../../shared/types";
import type { AnyRequestMsg, AnyResponse } from "../../shared/messaging";

// Module-level state for single-instance management
let isPolling = false;
let lastUrl = "";
let pollIntervalId: number | undefined;

// Debug helper
function debugLog(...args: any[]) {
    if (localStorage.getItem("tryon_debug_ui") === "1") {
        console.log("[TryOn UI]", ...args);
    }
}

function getAsinFromUrl(url: string): string | null {
    const m = url.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
    return m ? m[1].toUpperCase() : null;
}

export function injectTryOnButton() {
    debugLog("injectTryOnButton called");

    // 1. Idempotency UI Check
    let host = document.getElementById("tryon-extension-root");
    if (!host) {
        debugLog("Creating UI root");
        host = document.createElement("div");
        host.id = "tryon-extension-root";
        document.body.appendChild(host);

        const shadow = host.attachShadow({ mode: "open" });
        const styleTag = document.createElement("style");
        styleTag.textContent = STYLES;
        shadow.appendChild(styleTag);

        const container = document.createElement("div");
        container.id = "tryon-ui-container";
        shadow.appendChild(container);

        // Render initial structure
        renderBaseUI(container, shadow);
    } else {
        debugLog("UI root already exists, skipping creation");
    }

    // 2. Ensure Navigation Polling is Active
    if (!isPolling) {
        startNavigationPolling();
    }
}

function startNavigationPolling() {
    isPolling = true;
    lastUrl = location.href;
    debugLog("Starting navigation polling");

    clearInterval(pollIntervalId);
    pollIntervalId = window.setInterval(() => {
        const current = location.href;
        if (current !== lastUrl) {
            handleNavigation(current);
            lastUrl = current;
        }
    }, 750);
}

function handleNavigation(newUrl: string) {
    // Only verify ASIN change to avoid spam
    const oldAsin = getAsinFromUrl(lastUrl);
    const newAsin = getAsinFromUrl(newUrl);

    if (newAsin && newAsin !== oldAsin) {
        debugLog("Detected PDP Navigation:", oldAsin, "->", newAsin);

        // Close drawer to avoid stale state
        const host = document.getElementById("tryon-extension-root");
        const panel = host?.shadowRoot?.getElementById("tryon-panel");
        if (panel && panel.classList.contains("open")) {
            panel.classList.remove("open");
            debugLog("Drawer closed due to navigation");
        }
    }
}

function renderBaseUI(container: HTMLElement, shadow: ShadowRoot) {
    // Floating Button
    const btn = document.createElement("button");
    btn.id = "tryon-trigger-btn";
    btn.innerHTML = `
        <svg fill="currentColor" viewBox="0 0 24 24">
            <path d="M20,6H4V4H20M20,18H4V20H20M20,11H4V13H20" />
        </svg>
        Try On
    `;
    container.appendChild(btn);

    // Panel
    const panel = document.createElement("div");
    panel.id = "tryon-panel";
    panel.innerHTML = `
        <div class="panel-header">
            <h2 class="panel-title">Virtual Try-On</h2>
            <button class="close-btn" aria-label="Close">&times;</button>
        </div>
        <div class="panel-content">
            <div id="loading-state" style="text-align:center; padding: 40px; color:#666;">
                Loading product info...
            </div>
            <div id="product-details" style="display:none;"></div>
        </div>
    `;
    container.appendChild(panel);

    // Bind Events
    const closeBtn = panel.querySelector(".close-btn") as HTMLButtonElement;
    const contentArea = panel.querySelector("#product-details") as HTMLDivElement;
    const loadingState = panel.querySelector("#loading-state") as HTMLDivElement;

    const togglePanel = async () => {
        const isOpen = panel.classList.contains("open");
        if (isOpen) {
            panel.classList.remove("open");
        } else {
            panel.classList.add("open");

            const renderedUrl = contentArea.getAttribute("data-source-url");
            const currentUrl = window.location.href;
            const renderedAsin = getAsinFromUrl(renderedUrl || "");
            const currentAsin = getAsinFromUrl(currentUrl);

            if (!contentArea.hasChildNodes() || (renderedAsin && currentAsin && renderedAsin !== currentAsin)) {
                await loadSnapshot(contentArea, loadingState);
            }
        }
    };

    btn.addEventListener("click", togglePanel);
    closeBtn.addEventListener("click", () => panel.classList.remove("open"));
}

async function loadSnapshot(
    contentArea: HTMLElement,
    loadingState: HTMLElement
) {
    const freshUrl = window.location.href; // (4) Always use current URL
    debugLog("loadSnapshot trigger for", freshUrl);

    loadingState.style.display = "block";
    contentArea.style.display = "none";
    contentArea.innerHTML = "";

    try {
        const req: AnyRequestMsg = { type: "GET_PRODUCT_SNAPSHOT", payload: { url: freshUrl } };
        const response = await chrome.runtime.sendMessage(req) as AnyResponse<ProductSnapshot>;

        if (response.ok) {
            debugLog("Snapshot received", response.data.asin);
            // Mark content area with source URL for stale checks
            contentArea.setAttribute("data-source-url", freshUrl);
            renderSnapshot(response.data, contentArea, loadingState);
        } else {
            renderError(response.error, contentArea);
        }
    } catch (e: any) {
        console.error(e);
        renderError(e.message, contentArea);
    } finally {
        loadingState.style.display = "none";
        contentArea.style.display = "block";
    }
}

function renderError(msg: string | undefined, contentArea: HTMLElement) {
    contentArea.innerHTML = `<div style="color:red; padding:20px;">Error: ${msg ?? "Unknown"}</div>`;
}

function pickBestImageUrl(primaryUrl?: string, gallery: string[] = []) {
    const isValid = (u?: string) => typeof u === "string" && u.startsWith("http");
    if (isValid(primaryUrl)) return primaryUrl!;
    const candidates = (gallery || []).filter((u) => {
        if (!isValid(u)) return false;
        if (u.includes("360_icon")) return false;
        if (u.includes("play-button")) return false;
        return true;
    });
    return candidates[0] || "";
}

function toHighResAmazonImageUrl(url: string): string {
    if (!url) return url;
    if (!url.includes("m.media-amazon.com/images/I/")) return url;
    return url.replace(/\._AC_[^.]*(?=\.jpg|\.jpeg|\.png|\.webp)/i, "");
}

function renderSnapshot(
    data: ProductSnapshot,
    contentArea: HTMLElement,
    loadingState: HTMLElement
) {
    const { title, price, primaryImage, imageGallery, confidence, sizeChart, bulletPoints, descriptionText } = data;

    // Derived Signals
    const hasPrice = !!price?.raw;
    const hasPrimaryImage = !!primaryImage?.url;
    const galleryCount = imageGallery.length;
    const hasGallery = galleryCount >= 2;
    const hasSizeChart = sizeChart.hasSizeChart;
    const measurementBasis = sizeChart.measurementBasis;
    const hasTextInfo = bulletPoints.length > 0 || (!!descriptionText && descriptionText.length > 0);
    const hasParsedSizeRows = (sizeChart.parsedRows?.length ?? 0) > 0;

    const readyForSizing = hasSizeChart && hasParsedSizeRows && (measurementBasis === "body" || measurementBasis === "garment");
    const readyForVisualOverlay = hasPrimaryImage && hasGallery;
    const readyForTextGuidance = hasTextInfo;

    const renderBadge = (label: string, status: "green" | "yellow" | "red", text: string) => `
        <div class="readiness-item">
            <span class="status-badge status-${status}">${label}</span>
            <span>${text}</span>
        </div>
    `;

    let sizingBadge = readyForSizing
        ? renderBadge("Ready", "green", `Sizing (${measurementBasis} chart found)`)
        : hasSizeChart
            ? renderBadge("Limited", "yellow", "Sizing (Chart found but incomplete)")
            : renderBadge("Missing", "red", "Sizing (No size chart)");

    let visualBadge = readyForVisualOverlay
        ? renderBadge("Ready", "green", `Visual (${galleryCount} images)`)
        : hasPrimaryImage
            ? renderBadge("Limited", "yellow", "Visual (Only 1 image)")
            : renderBadge("Missing", "red", "Visual (No images)");

    let textBadge = readyForTextGuidance
        ? renderBadge("Ready", "green", "Text (Description found)")
        : renderBadge("Missing", "yellow", "Text (No description)");

    const checkIcon = `<span class="icon-check">✓</span>`;
    const crossIcon = `<span class="icon-cross">✗</span>`;
    const renderCheck = (val: boolean, label: string) => `
        <div class="checklist-item">
            ${val ? checkIcon : crossIcon} ${label}
        </div>
    `;

    const safeMainImageUrl = pickBestImageUrl(primaryImage?.url, imageGallery);

    const html = `
    <div class="product-section">
      <div class="product-snapshot-header">
        <img id="tryon-main-thumb" src="${safeMainImageUrl}" class="product-thumb" />
        <div class="product-info">
          <h3 title="${title}">${title}</h3>
          <div class="product-price">${price?.raw || "N/A"}</div>
        </div>
      </div>

      <div class="gallery-grid">
        ${imageGallery.slice(0, 10).map(url =>
        `<img src="${url}" class="gallery-img" data-url="${url}" />`
    ).join("")}
      </div>

      <div class="metrics-row">
        <div class="metric">
          <span class="metric-val">${Math.round(confidence.templateMatch * 100)}%</span>
          <span class="metric-label">Match</span>
        </div>
        <div class="metric">
          <span class="metric-val">${Math.round(confidence.dataCompleteness * 100)}%</span>
          <span class="metric-label">Data</span>
        </div>
      </div>
    </div>

    <!-- Readiness Section -->
    <div class="readiness-section">
        <h4 class="readiness-title">Try-on Readiness</h4>
        ${sizingBadge}
        ${visualBadge}
        ${textBadge}

        <div class="checklist">
            ${renderCheck(hasPrice, "Price detected")}
            ${renderCheck(hasPrimaryImage, "Primary image")}
            ${renderCheck(hasGallery, `Gallery (${galleryCount} images)`)}
            ${renderCheck(hasTextInfo, "Text description")}
            ${renderCheck(hasSizeChart, `Size Chart (${measurementBasis ?? "unknown"})`)}
            ${renderCheck(hasParsedSizeRows, `Parsed rows (${sizeChart.parsedRows?.length ?? 0})`)}
        </div>
    </div>

    <div class="size-chart-section">
      <h4>Size Chart Info</h4>
      <div class="sc-meta">
        <span class="pill">${sizeChart.hasSizeChart ? "Found" : "Missing"}</span>
        ${sizeChart.type !== "unknown" ? `<span class="pill">${sizeChart.type}</span>` : ""}
        ${sizeChart.unit !== "unknown" ? `<span class="pill">Unit: ${sizeChart.unit}</span>` : ""}
        ${sizeChart.measurementBasis !== "unknown" ? `<span class="pill">Basis: ${sizeChart.measurementBasis}</span>` : ""}
      </div>

      ${renderSizeTable(sizeChart.parsedRows, sizeChart.headers)}
    </div>

    <div class="action-bar">
      <button id="refresh-btn" class="btn-secondary">Refresh Snapshot</button>
    </div>

    <div class="debug-section">
      <details>
        <summary class="debug-summary">Debug JSON</summary>
        <pre class="debug-pre">${JSON.stringify(data, null, 2)}</pre>
      </details>
    </div>
  `;

    contentArea.innerHTML = html;

    // Refresh Handler
    contentArea.querySelector("#refresh-btn")?.addEventListener("click", () => {
        loadSnapshot(contentArea, loadingState);
    });

    // Main Image Fallback
    const mainThumb = contentArea.querySelector<HTMLImageElement>("#tryon-main-thumb");
    if (mainThumb) {
        mainThumb.onerror = () => {
            const fallback = pickBestImageUrl(undefined, imageGallery);
            const hiFallback = fallback ? toHighResAmazonImageUrl(fallback) : "";
            if (hiFallback && mainThumb.src !== hiFallback) mainThumb.src = hiFallback;
        };
    }

    // Gallery Interactivity
    contentArea.querySelectorAll<HTMLImageElement>(".gallery-img").forEach((img, idx) => {
        img.addEventListener("click", () => {
            const url = img.getAttribute("data-url") || img.src;
            const hi = toHighResAmazonImageUrl(url);
            const mt = contentArea.querySelector<HTMLImageElement>("#tryon-main-thumb");
            if (mt && hi) mt.src = hi;
        });
        img.addEventListener("dblclick", () => {
            const hiUrls = imageGallery.map(toHighResAmazonImageUrl).filter(u => u && u.startsWith("http"));
            openTryOnLightbox(hiUrls, idx, title || "Image Preview");
        });
    });

    // Main Image Lightbox
    if (mainThumb) {
        mainThumb.style.cursor = "zoom-in";
        mainThumb.addEventListener("click", () => {
            const hiUrls = imageGallery.map(toHighResAmazonImageUrl).filter(u => u && u.startsWith("http"));
            const current = toHighResAmazonImageUrl(mainThumb.src);
            const startIndex = Math.max(0, hiUrls.indexOf(current));
            openTryOnLightbox(hiUrls, startIndex, title || "Image Preview");
        });
    }
}

function renderSizeTable(rows?: ParsedSizeChartRow[], headers?: string[]) {
    if (!rows || rows.length === 0) return '<div style="color:#777; font-style:italic;">No parsed rows available.</div>';

    const headHtml = headers?.map(h => `<th>${h}</th>`).join("") || "";
    const MAX_ROWS = 5;
    const visibleRows = rows.slice(0, MAX_ROWS);
    const hiddenRows = rows.slice(MAX_ROWS);

    const renderRow = (r: ParsedSizeChartRow) => {
        const cols = headers
            ? headers.map(h => r[h]?.raw || "-")
            : Object.values(r).map(c => c.raw);
        return `<tr>${cols.map(c => `<td>${c}</td>`).join("")}</tr>`;
    };

    let tableBody = visibleRows.map(renderRow).join("");
    let hiddenBody = "";

    if (hiddenRows.length > 0) {
        hiddenBody = hiddenRows.map(renderRow).join("");
        return `
            <div class="sc-table-container">
                <table class="sc-table">
                    <thead><tr>${headHtml}</tr></thead>
                    <tbody>${tableBody}</tbody>
                    <tbody id="hidden-rows" style="display:none;">${hiddenBody}</tbody>
                </table>
            </div>
            <button class="btn-secondary" style="margin-top:4px;" onclick="
                const t = this.previousElementSibling.querySelector('#hidden-rows');
                const isHidden = t.style.display === 'none';
                t.style.display = isHidden ? 'table-row-group' : 'none';
                this.textContent = isHidden ? 'Show Less' : 'Show All (${rows.length})';
            ">Show All (${rows.length})</button>
        `;
    }
    return `
        <div class="sc-table-container">
            <table class="sc-table">
                <thead><tr>${headHtml}</tr></thead>
                <tbody>${tableBody}</tbody>
            </table>
        </div>
    `;
}

// Lightbox
type LightboxState = { urls: string[]; index: number; };
const TRYON_LIGHTBOX_ID = "tryon-lightbox-root";
let tryonLightboxState: LightboxState = { urls: [], index: 0 };

function ensureTryOnLightbox() {
    if (document.getElementById(TRYON_LIGHTBOX_ID)) return;
    const style = document.createElement("style");
    style.textContent = `
    #${TRYON_LIGHTBOX_ID} {
      position: fixed; inset: 0; z-index: 2147483647; display: none; align-items: center; justify-content: center; background: rgba(0,0,0,0.72);
    }
    #${TRYON_LIGHTBOX_ID}[data-open="true"] { display: flex; }
    #${TRYON_LIGHTBOX_ID} .tryon-lb-panel {
      position: relative; width: min(92vw, 980px); height: min(88vh, 760px); background: rgba(18,18,18,0.92); border-radius: 14px; box-shadow: 0 10px 30px rgba(0,0,0,0.45); overflow: hidden; display: flex; flex-direction: column;
    }
    #${TRYON_LIGHTBOX_ID} .tryon-lb-topbar {
      display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; color: #fff; font-family: system-ui, sans-serif; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,0.10);
    }
    #${TRYON_LIGHTBOX_ID} .tryon-lb-btn {
      background: rgba(255,255,255,0.10); border: 1px solid rgba(255,255,255,0.12); color: #fff; padding: 6px 10px; border-radius: 10px; cursor: pointer; user-select: none;
    }
    #${TRYON_LIGHTBOX_ID} .tryon-lb-btn:hover { background: rgba(255,255,255,0.16); }
    #${TRYON_LIGHTBOX_ID} .tryon-lb-body {
      position: relative; flex: 1; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.20);
    }
    #${TRYON_LIGHTBOX_ID} img.tryon-lb-img {
      max-width: 100%; max-height: 100%; object-fit: contain; display: block;
    }
    #${TRYON_LIGHTBOX_ID} .tryon-lb-arrow {
      position: absolute; top: 50%; transform: translateY(-50%); width: 44px; height: 44px; border-radius: 999px; display: flex; align-items: center; justify-content: center; cursor: pointer; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.14); color: #fff; font-size: 18px; user-select: none;
    }
    #${TRYON_LIGHTBOX_ID} .tryon-lb-arrow:hover { background: rgba(255,255,255,0.18); }
    #${TRYON_LIGHTBOX_ID} .tryon-lb-prev { left: 14px; }
    #${TRYON_LIGHTBOX_ID} .tryon-lb-next { right: 14px; }
    #${TRYON_LIGHTBOX_ID} .tryon-lb-footer {
      padding: 10px 12px; border-top: 1px solid rgba(255,255,255,0.10); display: flex; gap: 8px; overflow-x: auto; background: rgba(12,12,12,0.55);
    }
    #${TRYON_LIGHTBOX_ID} .tryon-lb-thumb {
      width: 56px; height: 56px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.14); object-fit: cover; cursor: pointer; opacity: 0.82;
    }
    #${TRYON_LIGHTBOX_ID} .tryon-lb-thumb[data-active="true"] { outline: 2px solid rgba(255,255,255,0.55); opacity: 1; }
    `;
    document.head.appendChild(style);

    const root = document.createElement("div");
    root.id = TRYON_LIGHTBOX_ID;
    root.innerHTML = `
    <div class="tryon-lb-panel" role="dialog" aria-modal="true">
      <div class="tryon-lb-topbar">
        <div id="tryon-lb-title">Image Preview</div>
        <div style="display:flex; gap:8px;">
          <button class="tryon-lb-btn" id="tryon-lb-open-newtab">Open</button>
          <button class="tryon-lb-btn" id="tryon-lb-close">Close</button>
        </div>
      </div>
      <div class="tryon-lb-body">
        <div class="tryon-lb-arrow tryon-lb-prev" id="tryon-lb-prev">‹</div>
        <img class="tryon-lb-img" id="tryon-lb-img" src="" alt="preview" />
        <div class="tryon-lb-arrow tryon-lb-next" id="tryon-lb-next">›</div>
      </div>
      <div class="tryon-lb-footer" id="tryon-lb-thumbs"></div>
    </div>
    `;
    document.body.appendChild(root);

    const close = () => closeTryOnLightbox();
    root.addEventListener("click", (e) => { if (e.target === root) close(); });
    root.querySelector("#tryon-lb-close")?.addEventListener("click", close);
    window.addEventListener("keydown", (e) => {
        const open = root.getAttribute("data-open") === "true";
        if (!open) return;
        if (e.key === "Escape") close();
        if (e.key === "ArrowLeft") stepTryOnLightbox(-1);
        if (e.key === "ArrowRight") stepTryOnLightbox(1);
    });
    root.querySelector("#tryon-lb-prev")?.addEventListener("click", () => stepTryOnLightbox(-1));
    root.querySelector("#tryon-lb-next")?.addEventListener("click", () => stepTryOnLightbox(1));
    root.querySelector("#tryon-lb-open-newtab")?.addEventListener("click", () => {
        const url = tryonLightboxState.urls[tryonLightboxState.index];
        if (url) window.open(url, "_blank");
    });
}

function renderTryOnLightbox() {
    const root = document.getElementById(TRYON_LIGHTBOX_ID);
    if (!root) return;
    const img = root.querySelector<HTMLImageElement>("#tryon-lb-img");
    const thumbs = root.querySelector<HTMLDivElement>("#tryon-lb-thumbs");
    if (!img || !thumbs) return;

    const url = tryonLightboxState.urls[tryonLightboxState.index] || "";
    img.src = url;
    thumbs.innerHTML = tryonLightboxState.urls.slice(0, 20).map((u, i) =>
        `<img class="tryon-lb-thumb" data-idx="${i}" data-active="${i === tryonLightboxState.index}" src="${u}" />`
    ).join("");
    thumbs.querySelectorAll<HTMLImageElement>(".tryon-lb-thumb").forEach((t) => {
        t.addEventListener("click", () => {
            const idx = Number(t.getAttribute("data-idx") || "0");
            tryonLightboxState.index = Math.max(0, Math.min(tryonLightboxState.urls.length - 1, idx));
            renderTryOnLightbox();
        });
    });
}

function openTryOnLightbox(urls: string[], startIndex = 0, title = "Image Preview") {
    ensureTryOnLightbox();
    const root = document.getElementById(TRYON_LIGHTBOX_ID)!;
    tryonLightboxState = { urls, index: Math.max(0, Math.min(urls.length - 1, startIndex)) };
    const titleEl = root.querySelector<HTMLDivElement>("#tryon-lb-title");
    if (titleEl) titleEl.textContent = title;
    root.setAttribute("data-open", "true");
    renderTryOnLightbox();
}

function closeTryOnLightbox() {
    const root = document.getElementById(TRYON_LIGHTBOX_ID);
    if (!root) return;
    root.setAttribute("data-open", "false");
}

function stepTryOnLightbox(delta: number) {
    if (!tryonLightboxState.urls.length) return;
    const next = (tryonLightboxState.index + delta + tryonLightboxState.urls.length) % tryonLightboxState.urls.length;
    tryonLightboxState.index = next;
    renderTryOnLightbox();
}
