import { logger } from '@tf2qs/telemetry/src/otel';
import knex, {Knex} from "knex";
import dbConfig from "../../../../knexfile";

export class KnexConnectionManager  {

    public static readonly client: Knex = knex(dbConfig)

    public static async initialize(): Promise<void> {
        try {
            await this.client.migrate.latest();
            logger.emit({ severityText: 'INFO', body: 'Database migrations ran successfully.' });
        } catch (error) {
            logger.emit({ severityText: 'ERROR', body: 'Error running database migrations', attributes: { error: JSON.stringify(error, Object.getOwnPropertyNames(error)) } });
            throw error;
        }
    }
    

}