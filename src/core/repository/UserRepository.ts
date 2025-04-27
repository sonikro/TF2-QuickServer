import { User } from "../domain/User";

export interface UserRepository {
    getById(id: string): Promise<User | null>;
    upsert(user: User): Promise<void>;
}
