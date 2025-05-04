import fs from 'fs';
import https from 'https';
import path from 'path';

const bzip2 = require('node-bzip2');

// Base URL for downloads
const BASE_URL = "https://fastdl.serveme.tf/maps/";

// Resolve paths
const mapsDir = path.resolve(__dirname, '../maps');
const mapsJsonPath = path.resolve(__dirname, '../maps.json');

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
    console.error("Error reading maps.json:", (error as Error).message);
    process.exit(1);
}

// Function to download and handle a map
const downloadMap = (mapEntry: MapEntry): Promise<void> => {
    return new Promise((resolve, reject) => {
        const mapName = typeof mapEntry === 'string' ? mapEntry : mapEntry.name;
        const mapUrl = typeof mapEntry === 'string' ? `${BASE_URL}${mapName}.bsp` : mapEntry.url;
        const filePath = path.join(mapsDir, `${mapName}.bsp`);
        const tempFilePath = filePath + (mapUrl.endsWith('.bz2') ? '.bz2' : '');

        if (fs.existsSync(filePath)) {
            console.log(`Map ${mapName}.bsp already exists. Skipping download.`);
            resolve();
            return;
        }

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
                                fs.unlinkSync(tempFilePath); // Remove the .bz2 file after extraction
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
            } else {
                console.error(`Error downloading ${mapName}: HTTP ${response.statusCode}`);
                fs.unlinkSync(tempFilePath); // Remove incomplete file
                reject(new Error(`Failed to download ${mapName}`));
            }
        }).on('error', (err) => {
            console.error(`Error downloading ${mapName}:`, err.message);
            fs.unlinkSync(tempFilePath); // Remove incomplete file
            reject(err);
        });
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
        try {
            await downloadMap(map);
        } catch (error) {
            console.error(`Failed to download ${typeof map === 'string' ? map : map.name}:`, (error as Error).message);
        }
    }
    console.log("Download process completed.");
};

// Start the download process
downloadAllMaps(maps).catch((error) => {
    console.error("Unexpected error during download process:", (error as Error).message);
}).then(() => {
    console.log("All downloads attempted.");
    process.exit(0);
});