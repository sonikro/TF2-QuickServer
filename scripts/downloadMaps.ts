import fs from 'fs';
import https from 'https';
import path from 'path';

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
let maps: string[];
try {
    const mapsData = fs.readFileSync(mapsJsonPath, 'utf-8');
    maps = JSON.parse(mapsData) as string[];
} catch (error) {
    console.error("Error reading maps.json:", (error as Error).message);
    process.exit(1);
}

// Function to download a map
const downloadMap = (map: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const filePath = path.join(mapsDir, `${map}.bsp`);
        if (fs.existsSync(filePath)) {
            console.log(`Map ${map}.bsp already exists. Skipping download.`);
            resolve();
            return;
        }

        console.log(`Downloading ${map}.bsp...`);
        const file = fs.createWriteStream(filePath);
        https.get(`${BASE_URL}${map}.bsp`, (response) => {
            if (response.statusCode === 200) {
                response.pipe(file);
                file.on('finish', () => {
                    file.close(() => {
                        console.log(`Download completed: ${map}.bsp`);
                        resolve();
                    });
                });
            } else {
                console.error(`Error downloading ${map}.bsp: HTTP ${response.statusCode}`);
                fs.unlinkSync(filePath); // Remove incomplete file
                reject(new Error(`Failed to download ${map}.bsp`));
            }
        }).on('error', (err) => {
            console.error(`Error downloading ${map}.bsp:`, err.message);
            fs.unlinkSync(filePath); // Remove incomplete file
            reject(err);
        });
    });
};

// Download all maps
const downloadAllMaps = async (maps: string[]): Promise<void> => {
    for (const map of maps) {
        try {
            await downloadMap(map);
        } catch (error) {
            console.error(`Failed to download ${map}:`, (error as Error).message);
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
})