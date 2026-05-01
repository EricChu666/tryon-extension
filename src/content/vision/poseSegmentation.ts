import { PoseLandmarker, FilesetResolver, PoseLandmarkerResult } from "@mediapipe/tasks-vision";

let poseLandmarker: PoseLandmarker | null = null;
let initPromise: Promise<PoseLandmarker> | null = null;

export type PoseResult = {
    keypoints: { x: number, y: number, name: string }[];
    maskData: Uint8ClampedArray;
    width: number;
    height: number;
};

export async function initPoseLandmarker(): Promise<PoseLandmarker> {
    if (poseLandmarker) return poseLandmarker;
    if (initPromise) return initPromise;

    initPromise = (async () => {
        const wasmUrl = chrome.runtime.getURL("mediapipe");
        const modelUrl = chrome.runtime.getURL("mediapipe/pose_landmarker_lite.task");
        
        console.log("Initializing MediaPipe, WASM Path:", wasmUrl, "Model Path:", modelUrl);
        const vision = await FilesetResolver.forVisionTasks(wasmUrl);
        
        const instance = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: modelUrl,
                delegate: "GPU"
            },
            runningMode: "IMAGE",
            outputSegmentationMasks: true
        });
        poseLandmarker = instance;
        return instance;
    })();

    return initPromise;
}

function createImageFromUrl(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
}

// Memory cache for current session
const analysisCache = new Map<string, PoseResult>();

export async function analyzePhoto(dataUrl: string): Promise<PoseResult> {
    if (analysisCache.has(dataUrl)) {
        return analysisCache.get(dataUrl)!;
    }

    const landmarker = await initPoseLandmarker();
    const img = await createImageFromUrl(dataUrl);

    // MediaPipe processes the image natively
    console.log("Running poseLandmarker.detect() on image of size", img.width, img.height);
    const result = landmarker.detect(img);

    if (!result.landmarks || result.landmarks.length === 0) {
        throw new Error("No pose detected in the photo.");
    }

    // Extract shoulders (11=left_shoulder, 12=right_shoulder) 
    // and hips (23=left_hip, 24=right_hip)
    const pts = result.landmarks[0];
    const keypoints = [];
    
    if (pts[11]) keypoints.push({ x: pts[11].x * img.width, y: pts[11].y * img.height, name: "L-Shoulder" });
    if (pts[12]) keypoints.push({ x: pts[12].x * img.width, y: pts[12].y * img.height, name: "R-Shoulder" });
    if (pts[23]) keypoints.push({ x: pts[23].x * img.width, y: pts[23].y * img.height, name: "L-Hip" });
    if (pts[24]) keypoints.push({ x: pts[24].x * img.width, y: pts[24].y * img.height, name: "R-Hip" });

    // Handle segmentation mask
    if (!result.segmentationMasks || result.segmentationMasks.length === 0) {
        throw new Error("No segmentation mask returned.");
    }

    const mask = result.segmentationMasks[0];
    const w = mask.width;
    const h = mask.height;
    
    // We treat the mask as a float32 array in [0, 1] range to be safe.
    let floats: Float32Array | null = null;
    let bytes: Uint8Array | null = null;
    try {
        floats = mask.getAsFloat32Array();
    } catch {
        bytes = mask.getAsUint8Array();
    }

    // Convert into a fully opaque Uint8ClampedArray for ImageData (we will apply alpha in UI)
    const pixelCount = w * h;
    const maskData = new Uint8ClampedArray(pixelCount * 4);

    for (let i = 0; i < pixelCount; i++) {
        const val = floats ? floats[i] : (bytes ? bytes[i] / 255 : 0);
        // We put the confidence into the alpha channel, but also map RGB to white
        // so that in UI, we can color it using canvas composites or just set RGB here
        // We will just store the raw [0,255] alpha here. 
        const a = Math.round(val * 255);
        maskData[i * 4 + 0] = 255;
        maskData[i * 4 + 1] = 255;
        maskData[i * 4 + 2] = 255;
        maskData[i * 4 + 3] = a; 
    }

    // Free mask resource if explicitly required in newer tasks-vision versions
    if (typeof mask.close === "function") {
        mask.close();
    }

    const finalResult: PoseResult = {
        keypoints,
        maskData,
        width: w,
        height: h
    };

    analysisCache.set(dataUrl, finalResult);
    return finalResult;
}
