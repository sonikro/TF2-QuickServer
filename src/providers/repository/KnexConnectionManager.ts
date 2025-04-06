import knex, {Knex} from "knex";
import dbConfig from "../../../knexfile";

export class KnexConnectionManager  {

    public static readonly client: Knex = knex(dbConfig)

    public static async initialize(): Promise<void> {
        try {
            await this.client.migrate.latest();
            console.log("Database migrations ran successfully.");
        } catch (error) {
            console.error("Error running database migrations:", error);
            throw error;
        }
    }
    

}