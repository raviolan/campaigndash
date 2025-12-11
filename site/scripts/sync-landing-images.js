#!/usr/bin/env node

/**
 * Sync landing page card images with entity page header images
 * Reads --header CSS variable from entity pages and updates landing page cards
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SITE_ROOT = path.resolve(__dirname, '..');

// Landing page configurations
const LANDING_PAGES = [
    {
        landingPage: '03_PCs/Characters.html',
        entityDir: '03_PCs',
        excludeFiles: ['Characters.html', 'Extras and quirks.html']
    },
    {
        landingPage: '04_NPCs/NPCs.html',
        entityDir: '04_NPCs',
        excludeFiles: ['NPCs.html']
    },
    {
        landingPage: '02_World/Locations/Locations.html',
        entityDir: '02_World/Locations',
        excludeFiles: ['Locations.html']
    }
];

/**
 * Extract the --header CSS variable value from an HTML file
 */
function extractHeaderImage(htmlContent) {
    // Match: <div class="entity-header" style="--header:url('/assets/...')">
    // or: <div class="entity-header" style="--header: url('/assets/...');">
    const match = htmlContent.match(/class="entity-header"\s+style="[^"]*--header:\s*url\(['"]([^'"]+)['"]\)/);
    if (match) {
        return match[1];
    }
    return null;
}

/**
 * Get entity name from HTML file
 */
function extractEntityName(htmlContent) {
    const titleMatch = htmlContent.match(/<title>([^<]+)<\/title>/);
    return titleMatch ? titleMatch[1] : null;
}

/**
 * Scan entity directory and build image map
 */
function buildImageMap(entityDir, excludeFiles, siteRoot = SITE_ROOT) {
    const fullPath = path.join(siteRoot, entityDir);
    const files = fs.readdirSync(fullPath).filter(f =>
        f.endsWith('.html') && !excludeFiles.includes(f)
    );

    const imageMap = {};

    for (const file of files) {
        const filePath = path.join(fullPath, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const headerImage = extractHeaderImage(content);
        const entityName = extractEntityName(content);

        if (entityName) {
            imageMap[entityName] = headerImage || '/assets/ph-header.svg'; // fallback to placeholder
        }
    }

    return imageMap;
}

/**
 * Update landing page with new images
 */
function updateLandingPage(landingPagePath, imageMap, siteRoot = SITE_ROOT, silent = false) {
    const fullPath = path.join(siteRoot, landingPagePath);
    let content = fs.readFileSync(fullPath, 'utf8');

    let updated = false;

    // Find and update each landing card
    // Match: <a href="..." class="landing-card">...<h3 class="landing-card-title">EntityName</h3>
    const cardRegex = /<a href="[^"]*" class="landing-card">\s*<div class="landing-card-image" style="background-image: url\('([^']+)'\)">\s*<\/div>\s*<h3 class="landing-card-title">([^<]+)<\/h3>/g;

    content = content.replace(cardRegex, (match, currentImage, entityName) => {
        const newImage = imageMap[entityName];

        if (newImage && newImage !== currentImage) {
            if (!silent) console.log(`  📸 ${entityName}: ${currentImage} → ${newImage}`);
            updated = true;
            return match.replace(
                `background-image: url('${currentImage}')`,
                `background-image: url('${newImage}')`
            );
        }

        return match;
    });

    if (updated) {
        fs.writeFileSync(fullPath, content, 'utf8');
        if (!silent) console.log(`✅ Updated ${landingPagePath}`);
        return true;
    } else {
        if (!silent) console.log(`✓ ${landingPagePath} (no changes needed)`);
        return false;
    }
}

/**
 * Main function
 */
export function syncLandingImages(siteRoot = SITE_ROOT, silent = false) {
    if (!silent) console.log('🔄 Syncing landing page images from entity pages...\n');

    let totalUpdated = 0;

    for (const config of LANDING_PAGES) {
        if (!silent) console.log(`📂 Processing ${config.landingPage}...`);

        const imageMap = buildImageMap(config.entityDir, config.excludeFiles, siteRoot);
        if (!silent) console.log(`  Found ${Object.keys(imageMap).length} entities`);

        const updated = updateLandingPage(config.landingPage, imageMap, siteRoot, silent);
        if (updated) totalUpdated++;

        if (!silent) console.log('');
    }

    if (!silent) console.log(`\n✨ Done! Updated ${totalUpdated} landing page(s)`);
    return totalUpdated;
}

// Run as CLI script
const isRunningDirectly = import.meta.url === new URL(process.argv[1], 'file://').href ||
    import.meta.url.endsWith(process.argv[1]);
if (isRunningDirectly) {
    syncLandingImages();
}
