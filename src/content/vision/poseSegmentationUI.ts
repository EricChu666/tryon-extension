import { analyzePhoto, PoseResult } from "./poseSegmentation";

// Constants for mask transparency and coloring
const MASK_ALPHA = 0.35;
const MASK_COLOR = [0, 150, 136]; // Teal

let isShowingMask = true;

/**
 * Ensures standard styles for overlay elements are injected
 */
function ensureUIStyles() {
    if (document.getElementById("tryon-vision-styles")) return;
    const style = document.createElement("style");
    style.id = "tryon-vision-styles";
    style.textContent = `
        .vision-ui-spinner {
            position: absolute; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.6); color: white;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            z-index: 100; font-family: sans-serif;
        }
        .vision-ui-spinner span {
            margin-top: 10px; font-weight: bold;
        }
        .vision-error-banner {
            position: absolute; top: 10px; left: 10px; right: 10px;
            background: #ffebee; color: #c62828; padding: 10px;
            border-radius: 4px; font-size: 13px; z-index: 101;
            text-align: center; font-weight: bold;
        }
        .vision-controls-pnl {
            margin-top: 10px; padding: 10px; background: #f5f5f5; border-radius: 6px;
            display: flex; justify-content: space-between; align-items: center;
        }
        .vision-canvas-overlay {
            position: absolute;
            pointer-events: none;
            z-index: 10;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Compute letterboxing offsets for object-fit: contain
 */
function getContainMetrics(containerW: number, containerH: number, imgW: number, imgH: number) {
    const doRatio = imgW / imgH;
    const cRatio = containerW / containerH;
    
    let targetW, targetH;
    if (doRatio > cRatio) {
        targetW = containerW;
        targetH = targetW / doRatio;
    } else {
        targetH = containerH;
        targetW = targetH * doRatio;
    }

    return {
        width: targetW,
        height: targetH,
        left: (containerW - targetW) / 2,
        top: (containerH - targetH) / 2
    };
}

export async function runAnalysis(dataUrl: string, stageContainer: HTMLElement, controlContainer: HTMLElement) {
    ensureUIStyles();

    // 1. Show Spinner
    let spinner = stageContainer.querySelector(".vision-ui-spinner");
    if (!spinner) {
        spinner = document.createElement("div");
        spinner.className = "vision-ui-spinner";
        spinner.innerHTML = `<svg width="40" height="40" viewBox="0 0 50 50" style="animation: spin 1s linear infinite"><circle cx="25" cy="25" r="20" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="31 31"/></svg><span>Analyzing...</span><style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>`;
        stageContainer.appendChild(spinner);
    }
    spinner.setAttribute("style", "display: flex;");

    // Clear previous specific overlays
    stageContainer.querySelectorAll(".vision-canvas-overlay, .vision-error-banner").forEach(el => el.remove());
    controlContainer.querySelector(".vision-controls-pnl")?.remove();

    try {
        const result = await analyzePhoto(dataUrl);

        // 2. Hide spinner
        spinner.setAttribute("style", "display: none;");

        // 3. Setup canvas coordinates using object-fit metrics
        const userImg = stageContainer.querySelector(".stage-user-img") as HTMLImageElement;
        if (!userImg) throw new Error("Could not find user photo element.");

        const stageRect = stageContainer.getBoundingClientRect();
        const natW = userImg.naturalWidth;
        const natH = userImg.naturalHeight;

        const metrics = getContainMetrics(stageRect.width, stageRect.height, natW, natH);

        // Create overlay canvas matches image natural size for drawing, rendered at metrics size
        const canvas = document.createElement("canvas");
        canvas.className = "vision-canvas-overlay";
        canvas.width = natW;
        canvas.height = natH;
        canvas.style.width = `${metrics.width}px`;
        canvas.style.height = `${metrics.height}px`;
        canvas.style.left = `${metrics.left}px`;
        canvas.style.top = `${metrics.top}px`;
        
        // We set position relative on container in CSS, but check standard injectTryOnButton.ts container, 
        // fallback to setting it here directly to ensure absolute anchoring works.
        stageContainer.style.position = "relative";
        stageContainer.appendChild(canvas);

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // 4. Render Mask 
        const renderData = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (isShowingMask) {
                // To colorize, we can use an offscreen canvas, putImageData, then composite
                const offCvs = document.createElement("canvas");
                offCvs.width = result.width; // mask resolution
                offCvs.height = result.height;
                const offCtx = offCvs.getContext("2d")!;
                
                const imageData = new ImageData(new Uint8ClampedArray(result.maskData), result.width, result.height);
                offCtx.putImageData(imageData, 0, 0);

                // Now offCvs has our white mask with target alphas
                // We'll draw it onto main canvas and tint it
                ctx.save();
                ctx.drawImage(offCvs, 0, 0, natW, natH);

                // Tint the mask to MASK_COLOR with MASK_ALPHA
                ctx.globalCompositeOperation = "source-in"; // keep only where mask is drawn, replace content
                ctx.fillStyle = `rgba(${MASK_COLOR[0]}, ${MASK_COLOR[1]}, ${MASK_COLOR[2]}, ${MASK_ALPHA})`;
                ctx.fillRect(0, 0, natW, natH);
                ctx.restore();
            }

            // 5. Render Keypoints (Shoulders + Hips)
            ctx.fillStyle = "magenta";
            ctx.strokeStyle = "white";
            ctx.lineWidth = 2;

            for (const pt of result.keypoints) {
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 6, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
                
                // Optional: point labels
                ctx.fillStyle = "white";
                ctx.font = "14px Arial";
                ctx.fillText(pt.name, pt.x + 10, pt.y + 4);
                ctx.fillStyle = "magenta"; // reset for next pt
            }
        };

        renderData();

        // 6. Build UI Controls
        const pnl = document.createElement("div");
        pnl.className = "vision-controls-pnl";
        pnl.innerHTML = `
            <label style="font-weight:bold; font-size:13px;">Pose & Segmentation Analysis</label>
            <label class="toggle-mask" style="cursor:pointer; display:flex; align-items:center; gap:6px; font-size: 13px;">
                <input type="checkbox" ${isShowingMask ? "checked" : ""} /> Show Mask
            </label>
        `;

        pnl.querySelector("input")!.addEventListener("change", (e) => {
            isShowingMask = (e.currentTarget as HTMLInputElement).checked;
            renderData();
        });

        controlContainer.prepend(pnl);

    } catch (e: any) {
        if (spinner) spinner.setAttribute("style", "display: none;");
        
        const err = document.createElement("div");
        err.className = "vision-error-banner";
        err.textContent = "Analysis failed: " + e.message;
        stageContainer.appendChild(err);

        setTimeout(() => err.remove(), 4000);
    }
}
