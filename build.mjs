// build.mjs
import * as esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";

const watch = process.argv.includes("--watch");

const distDir = "dist";
const publicDir = "public";

if (!fs.existsSync(distDir)) fs.mkdirSync(distDir);

function copyDir(src, dest) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) copyDir(srcPath, destPath);
        else fs.copyFileSync(srcPath, destPath);
    }
}

copyDir(publicDir, distDir);

const common = {
    bundle: true,
    sourcemap: true,
    target: ["es2022"],
    format: "esm",
    outdir: distDir
};

const buildOnce = async () => {
    await esbuild.build({
        ...common,
        entryPoints: {
            "background": "src/background/index.ts",
            "content": "src/content/index.ts"
        }
    });
    console.log("[build] done");
};

if (watch) {
    const ctx = await esbuild.context({
        ...common,
        entryPoints: {
            "background": "src/background/index.ts",
            "content": "src/content/index.ts"
        }
    });
    await ctx.watch();
    console.log("[watch] listening...");
} else {
    await buildOnce();
}
