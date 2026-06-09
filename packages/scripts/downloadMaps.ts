import fs from 'fs';
import https from 'https';
import path from 'path';

const bzip2 = require('node-bzip2');

// Prefer our FastDL first, then fall back to serveme.
const DEFAULT_PRIMARY_BASE_URL = 'https://maps.sonikro.com/fastdl/maps/';
const FALLBACK_BASE_URL = 'https://fastdl.serveme.tf/maps/';

const PRIMARY_BASE_URL = DEFAULT_PRIMARY_BASE_URL;

// Resolve paths
const mapsDir = path.resolve(__dirname, '../../maps');
const manifestArg = process.argv[2];
const mapManifestFile = manifestArg
    ? (manifestArg.endsWith('.json') ? manifestArg : `maps.${manifestArg}.json`)
    : 'maps.json';
const mapsJsonPath = path.resolve(__dirname, `../../${mapManifestFile}`);

// Ensure the maps directory exists
if (!fs.existsSync(mapsDir)) {
    fs.mkdirSync(mapsDir, { recursive: true });
}

// Read the list of maps from the JSON file
type MapEntry = string | { name: string; url: string };
let maps: MapEntry[];
try {
    const mapsData = fs.readFileSync(mapsJsonPath, 'utf-8');
    maps = JSON.parse(mapsData) as MapEntry[];
} catch (error) {
    console.error(`Error reading ${mapManifestFile}:`, (error as Error).message);
    process.exit(1);
}

// Function to download and handle a map
const downloadMap = (mapEntry: MapEntry): Promise<void> => {
    return new Promise((resolve, reject) => {
        const mapName = typeof mapEntry === 'string' ? mapEntry : mapEntry.name;
        const filePath = path.join(mapsDir, `${mapName}.bsp`);

        if (fs.existsSync(filePath)) {
            console.log(`Map ${mapName}.bsp already exists. Skipping download.`);
            resolve();
            return;
        }

        const downloadUrls = typeof mapEntry === 'string'
            ? [
                `${PRIMARY_BASE_URL}${mapName}.bsp.bz2`,
                `${PRIMARY_BASE_URL}${mapName}.bsp`,
                `${FALLBACK_BASE_URL}${mapName}.bsp`,
            ]
            : [mapEntry.url];

        const tryDownload = (urlIndex: number): void => {
            if (urlIndex >= downloadUrls.length) {
                reject(new Error(`Failed to download ${mapName} from all configured sources`));
                return;
            }

            const mapUrl = downloadUrls[urlIndex];
            const tempFilePath = filePath + (mapUrl.endsWith('.bz2') ? '.bz2' : '');

            console.log(`Downloading ${mapName} from ${mapUrl}...`);
            const file = fs.createWriteStream(tempFilePath);

            https.get(mapUrl, (response) => {
                if (response.statusCode === 200) {
                    response.pipe(file);
                    file.on('finish', async () => {
                        file.close(async () => {
                            if (mapUrl.endsWith('.bz2')) {
                                try {
                                    console.log(`Extracting ${mapName}.bz2 to ${mapName}.bsp...`);
                                    await extractBz2(tempFilePath, filePath);
                                    fs.unlinkSync(tempFilePath);
                                    console.log(`Extraction completed: ${mapName}.bsp`);
                                } catch (err: Error | any) {
                                    console.error(`Error extracting ${mapName}.bz2:`, err.message);
                                    reject(err);
                                    return;
                                }
                            }

                            console.log(`Download completed: ${mapName}.bsp`);
                            resolve();
                        });
                    });

                    return;
                }

                file.close(() => {
                    if (fs.existsSync(tempFilePath)) {
                        fs.unlinkSync(tempFilePath);
                    }

                    console.warn(`Source unavailable for ${mapName} at ${mapUrl} (HTTP ${response.statusCode}). Trying next source...`);
                    tryDownload(urlIndex + 1);
                });
            }).on('error', (err) => {
                file.close(() => {
                    if (fs.existsSync(tempFilePath)) {
                        fs.unlinkSync(tempFilePath);
                    }

                    console.warn(`Error downloading ${mapName} from ${mapUrl}: ${err.message}. Trying next source...`);
                    tryDownload(urlIndex + 1);
                });
            });
        };

        tryDownload(0);
    });
};

// Function to extract .bz2 files
const extractBz2 = async (source: string, destination: string): Promise<void> => {
    const sourceBytes = fs.readFileSync(source);
    const decompressed = bzip2.decompress(sourceBytes)
    fs.writeFileSync(destination, decompressed);
    console.log(`Decompressed ${source} to ${destination}`);
};

// Download all maps
const downloadAllMaps = async (maps: MapEntry[]): Promise<void> => {
    for (const map of maps) {
        await downloadMap(map);
    }
    console.log("Download process completed.");
};

// Start the download process
downloadAllMaps(maps).catch((error) => {
    console.error("Unexpected error during download process:", (error as Error).message);
    process.exit(1);
}).then(() => {
    console.log("All downloads attempted.");
    process.exit(0);
});
