// src/shared/storage.ts
import type { UserAssets, UserProfile, UserState } from "./types";

const SCHEMA_VERSION = 1;

const KEYS = {
    schemaVersion: "schemaVersion",
    userProfile: "userProfile",
    userAssets: "userAssets",
} as const;

type StorageShape = {
    [KEYS.schemaVersion]: number;
    [KEYS.userProfile]?: UserProfile;
    [KEYS.userAssets]?: UserAssets;
};

async function getAll(): Promise<StorageShape> {
    return new Promise((resolve) => {
        chrome.storage.local.get(null, (items) => resolve(items as StorageShape));
    });
}

async function setItems(items: Partial<StorageShape>): Promise<void> {
    return new Promise((resolve) => chrome.storage.local.set(items, resolve));
}

export async function ensureSchema(): Promise<void> {
    const all = await getAll();
    if (!all[KEYS.schemaVersion]) {
        await setItems({ [KEYS.schemaVersion]: SCHEMA_VERSION });
    }
    // future: migrations when SCHEMA_VERSION increments
}

export async function getUserState(): Promise<UserState> {
    await ensureSchema();
    const all = await getAll();
    return {
        schemaVersion: all[KEYS.schemaVersion] ?? SCHEMA_VERSION,
        profile: all[KEYS.userProfile],
        assets: all[KEYS.userAssets],
    };
}

export async function setUserProfile(profile: UserProfile): Promise<UserState> {
    await ensureSchema();
    await setItems({ [KEYS.userProfile]: profile });
    return getUserState();
}

export async function setUserAssets(assets: UserAssets): Promise<UserState> {
    await ensureSchema();
    await setItems({ [KEYS.userAssets]: assets });
    return getUserState();
}
