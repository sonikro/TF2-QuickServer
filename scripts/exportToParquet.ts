#!/usr/bin/env tsx
/**
 * Export SQLite server_history table to Parquet format for Databricks
 * 
 * Usage:
 *   npm run export:parquet
 *   tsx scripts/exportToParquet.ts
 *   tsx scripts/exportToParquet.ts --upload-s3 --bucket your-bucket-name
 */

import knex from 'knex';
import knexConfig from '../knexfile';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import * as parquet from 'parquetjs';

// Define TypeScript interfaces for better type safety
interface ServerHistoryRecord {
    serverId: string;
    createdAt: string | null;
    createdBy: string | null;
    terminatedAt: string | null;
    region: string;
    variant: string;
}

interface ProcessedServerRecord extends ServerHistoryRecord {
    createdAtParsed: Date | null;
    terminatedAtParsed: Date | null;
    serverDurationMinutes: number | null;
    createdDate: string | null;
    createdHour: number | null;
    createdDayOfWeek: string | null;
    isActive: boolean;
}

class ServerHistoryExporter {
    private db: knex.Knex;
    private s3Client: S3Client | null = null;

    constructor() {
        this.db = knex(knexConfig);
        
        // Initialize S3 client if AWS credentials are available
        try {
            this.s3Client = new S3Client({
                region: process.env.AWS_REGION || 'us-east-1'
            });
        } catch (error) {
            console.log('AWS credentials not configured, S3 upload will be disabled');
        }
    }

    /**
     * Export server history data from SQLite database
     */
    async exportServerHistory(): Promise<ProcessedServerRecord[]> {
        console.log('🔍 Fetching server history data...');

        const rawData = await this.db<ServerHistoryRecord>('server_history')
            .select('*')
            .orderBy('createdAt', 'desc');

        console.log(`📊 Found ${rawData.length} server history records`);

        // Process and enrich the data
        const processedData: ProcessedServerRecord[] = rawData.map(record => {
            const createdAt = this.parseTimestamp(record.createdAt);
            const terminatedAt = this.parseTimestamp(record.terminatedAt);

            return {
                ...record,
                createdAtParsed: createdAt,
                terminatedAtParsed: terminatedAt,
                serverDurationMinutes: this.calculateDuration(createdAt, terminatedAt),
                createdDate: createdAt ? createdAt.toISOString().split('T')[0] : null,
                createdHour: createdAt ? createdAt.getHours() : null,
                createdDayOfWeek: createdAt ? this.getDayOfWeek(createdAt) : null,
                isActive: terminatedAt === null
            };
        });

        this.printSummary(processedData);
        return processedData;
    }

    /**
     * Parse timestamp - handles both Unix timestamps and ISO strings
     */
    private parseTimestamp(timestamp: string | null): Date | null {
        if (!timestamp) return null;

        // Check if it's a Unix timestamp (numeric string)
        if (/^\d+$/.test(timestamp)) {
            // Convert from milliseconds to Date
            return new Date(parseInt(timestamp));
        }

        // Try to parse as ISO string
        const date = new Date(timestamp);
        return isNaN(date.getTime()) ? null : date;
    }

    /**
     * Calculate duration between two dates in minutes
     */
    private calculateDuration(start: Date | null, end: Date | null): number | null {
        if (!start) return null;
        if (!end) return null; // Server is still active

        const durationMs = end.getTime() - start.getTime();
        return Math.round(durationMs / (1000 * 60) * 100) / 100; // Round to 2 decimal places
    }

    /**
     * Get day of week name
     */
    private getDayOfWeek(date: Date): string {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[date.getDay()];
    }

    /**
     * Print data summary
     */
    private printSummary(data: ProcessedServerRecord[]): void {
        if (data.length === 0) {
            console.log('⚠️  No data found in server_history table');
            return;
        }

        const dates = data
            .map(r => r.createdAtParsed)
            .filter(d => d !== null) as Date[];
        
        const regions = [...new Set(data.map(r => r.region))];
        const variants = [...new Set(data.map(r => r.variant))];
        const activeServers = data.filter(r => r.isActive).length;

        console.log('\n📈 Data Summary:');
        console.log(`   Records: ${data.length}`);
        console.log(`   Date range: ${dates.length > 0 ? dates[dates.length - 1].toISOString().split('T')[0] : 'N/A'} to ${dates.length > 0 ? dates[0].toISOString().split('T')[0] : 'N/A'}`);
        console.log(`   Regions: ${regions.join(', ')}`);
        console.log(`   Variants: ${variants.join(', ')}`);
        console.log(`   Active servers: ${activeServers}`);
        console.log(`   Terminated servers: ${data.length - activeServers}`);
    }

    /**
     * Save data to Parquet file
     */
    async saveToParquet(data: ProcessedServerRecord[]): Promise<string> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const outputDir = path.join(process.cwd(), 'export');
        const fileName = `server_history_${timestamp}.parquet`;
        const filePath = path.join(outputDir, fileName);

        // Ensure export directory exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Define Parquet schema
        const schema = new parquet.ParquetSchema({
            serverId: { type: 'UTF8' },
            createdAt: { type: 'UTF8', optional: true },
            createdBy: { type: 'UTF8', optional: true },
            terminatedAt: { type: 'UTF8', optional: true },
            region: { type: 'UTF8' },
            variant: { type: 'UTF8' },
            createdAtISO: { type: 'UTF8', optional: true },
            terminatedAtISO: { type: 'UTF8', optional: true },
            serverDurationMinutes: { type: 'DOUBLE', optional: true },
            createdDate: { type: 'UTF8', optional: true },
            createdHour: { type: 'INT32', optional: true },
            createdDayOfWeek: { type: 'UTF8', optional: true },
            isActive: { type: 'BOOLEAN' }
        });

        // Create Parquet writer
        const writer = await parquet.ParquetWriter.openFile(schema, filePath);

        console.log(`📦 Writing ${data.length} records to Parquet file...`);

        // Debug: let's see what the first record looks like
        if (data.length > 0) {
            console.log('Sample record:', JSON.stringify(data[0], null, 2));
        }

        // Write data to Parquet file
        for (let i = 0; i < data.length; i++) {
            const record = data[i];
            try {
                // Convert data to match Parquet schema types - be very explicit about types
                const parquetRecord: any = {
                    serverId: String(record.serverId),
                    createdAt: record.createdAt ? String(record.createdAt) : undefined,
                    createdBy: record.createdBy ? String(record.createdBy) : undefined,
                    terminatedAt: record.terminatedAt ? String(record.terminatedAt) : undefined,
                    region: String(record.region),
                    variant: String(record.variant || ''),
                    createdAtISO: record.createdAtParsed ? record.createdAtParsed.toISOString() : undefined,
                    terminatedAtISO: record.terminatedAtParsed ? record.terminatedAtParsed.toISOString() : undefined,
                    serverDurationMinutes: typeof record.serverDurationMinutes === 'number' ? record.serverDurationMinutes : undefined,
                    createdDate: record.createdDate ? String(record.createdDate) : undefined,
                    createdHour: typeof record.createdHour === 'number' ? record.createdHour : undefined,
                    createdDayOfWeek: record.createdDayOfWeek ? String(record.createdDayOfWeek) : undefined,
                    isActive: Boolean(record.isActive)
                };

                await writer.appendRow(parquetRecord);
            } catch (error) {
                console.error(`Error writing record ${i}:`, error);
                console.log('Problematic record:', JSON.stringify(record, null, 2));
                throw error;
            }
        }

        // Close the writer
        await writer.close();
        console.log(`💾 Parquet file created: ${filePath}`);

        // Also create a CSV for easy viewing and JSON for debugging
        const csvFilePath = filePath.replace('.parquet', '.csv');
        const csvData = this.convertToCSV(data);
        fs.writeFileSync(csvFilePath, csvData);
        console.log(`📊 CSV version created: ${csvFilePath}`);

        const jsonFilePath = filePath.replace('.parquet', '.json');
        fs.writeFileSync(jsonFilePath, JSON.stringify(data, null, 2));
        console.log(`🔍 JSON version created for debugging: ${jsonFilePath}`);

        return filePath;
    }

    /**
     * Convert data to CSV format
     */
    private convertToCSV(data: ProcessedServerRecord[]): string {
        if (data.length === 0) return '';

        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];

        for (const record of data) {
            const values = headers.map(header => {
                const value = (record as any)[header];
                if (value === null || value === undefined) return '';
                if (typeof value === 'string' && value.includes(',')) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value.toString();
            });
            csvRows.push(values.join(','));
        }

        return csvRows.join('\n');
    }

    /**
     * Upload file to S3
     */
    async uploadToS3(filePath: string, bucketName: string, s3Key?: string): Promise<boolean> {
        if (!this.s3Client) {
            console.log('❌ S3 client not initialized. Make sure AWS credentials are configured.');
            return false;
        }

        const fileName = path.basename(filePath);
        const key = s3Key || `tf2-server-data/${fileName}`;

        try {
            console.log(`☁️  Uploading to S3: s3://${bucketName}/${key}`);

            const fileStream = fs.createReadStream(filePath);
            const upload = new Upload({
                client: this.s3Client,
                params: {
                    Bucket: bucketName,
                    Key: key,
                    Body: fileStream,
                    ContentType: filePath.endsWith('.json') ? 'application/json' : 'text/csv'
                }
            });

            await upload.done();
            console.log(`✅ Successfully uploaded to S3: s3://${bucketName}/${key}`);
            return true;

        } catch (error) {
            console.error('❌ Error uploading to S3:', error);
            return false;
        }
    }

    /**
     * Close database connection
     */
    async close(): Promise<void> {
        await this.db.destroy();
    }
}

/**
 * Main execution function
 */
async function main() {
    const args = process.argv.slice(2);
    const uploadToS3 = args.includes('--upload-s3');
    const bucketIndex = args.findIndex(arg => arg === '--bucket');
    const bucketName = bucketIndex !== -1 && args[bucketIndex + 1] ? args[bucketIndex + 1] : null;

    const exporter = new ServerHistoryExporter();

    try {
        console.log('🚀 Starting server history export...\n');

        // Export data
        const data = await exporter.exportServerHistory();
        
        if (data.length === 0) {
            console.log('⚠️  No data to export');
            return;
        }

        // Save to file
        const filePath = await exporter.saveToParquet(data);

        // Upload to S3 if requested
        if (uploadToS3) {
            if (!bucketName) {
                console.log('❌ Bucket name required for S3 upload. Use --bucket <bucket-name>');
                return;
            }
            await exporter.uploadToS3(filePath, bucketName);
        }

        console.log('\n✅ Export completed successfully!');
        
        if (!uploadToS3) {
            console.log('\n💡 To upload to S3, run with: --upload-s3 --bucket your-bucket-name');
        }

    } catch (error) {
        console.error('❌ Export failed:', error);
    } finally {
        await exporter.close();
    }
}

// Run if this file is executed directly
if (require.main === module) {
    main();
}

export { ServerHistoryExporter };
