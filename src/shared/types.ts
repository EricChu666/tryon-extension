// src/shared/types.ts
export type SourceSite = "amazon";

export type ApparelCategory = "tshirt" | "hoodie" | "unknown";

export type CurrencyCode = "USD" | "TWD" | "EUR" | "JPY" | string;

export type FitPreference = "regular" | "loose" | "slim";

export type ConfidenceScores = {
    templateMatch: number;       // 0..1
    dataCompleteness: number;    // 0..1
};

export type ProductPrice = {
    value?: number;      // best-effort parse
    currency?: CurrencyCode;
    raw?: string;        // original string
};

export type ProductImage = {
    url: string;
    alt?: string;
};

export type FitKeywords = {
    isOversized: boolean;
    isSlim: boolean;
    isRegular: boolean;
    rawHits: string[]; // matched phrases from title/desc/bullets
};

export type ModelInfo = {
    hasModelInfo: boolean;
    rawText: string;
};

export type SizeChartRow = {
    // For MVP, keep flexible: columns are messy across brands.
    // Example: { size: "M", chest: "40", length: "27" }
    [col: string]: string;
};

export type SizeChart = {
    hasSizeChart: boolean;
    type: "table" | "image" | "unknown";
    rawHtml?: string;          // if table
    imageUrl?: string;         // if image chart
    rows?: SizeChartRow[];     // optional parsed rows
};

export type ProductSnapshot = {
    source: SourceSite;
    url: string;
    asin?: string;

    title?: string;
    brand?: string;
    categoryGuess: ApparelCategory;

    price?: ProductPrice;

    primaryImage?: ProductImage;
    imageGallery: string[];

    bulletPoints: string[];
    descriptionText?: string;

    fitKeywords: FitKeywords;

    modelInfo: ModelInfo;
    sizeChart: SizeChart;

    confidence: ConfidenceScores;
    capturedAtIso: string;
};

export type UserProfile = {
    heightCm: number;
    fitPreference: FitPreference;
    createdAtIso: string;
    updatedAtIso: string;
};

export type UserAssets = {
    // MVP: ok to store dataURL in chrome.storage.local
    // Later: switch to IndexedDB Blob to avoid size limits.
    fullBodyPhotoDataUrl?: string;
    fullBodyPhotoUpdatedAtIso?: string;

    // Optional metadata
    fullBodyPhotoWidth?: number;
    fullBodyPhotoHeight?: number;
};

export type UserState = {
    profile?: UserProfile;
    assets?: UserAssets;
    schemaVersion: number;
};

export type Point = { x: number; y: number; score?: number };

export type PoseSegmentationResult = {
    keypoints: {
        leftShoulder: Point;
        rightShoulder: Point;
        leftHip: Point;
        rightHip: Point;
    };
    personMaskDataUrl: string; // grayscale/alpha mask
    imageWidth: number;
    imageHeight: number;
    processingMs: number;
};

export type GarmentExtractionResult = {
    garmentPngDataUrl: string;
    extractionQuality: "high" | "medium" | "low";
    notes: string[];
};

export type TryOnResult = {
    previewDataUrl: string;
    alignment: {
        leftShoulder: { x: number; y: number };
        rightShoulder: { x: number; y: number };
        scale: number;
        rotationDeg: number;
    };
    quality: "high" | "medium" | "low";
    notes: string[];
};
