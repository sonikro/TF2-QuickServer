export interface UserCreditsRepository {
    /**
     * Subtracts credits from a user.
     * @returns The remaining credits after subtraction.
     * @param args 
     */
    subtractCredits(args: { userId: string, credits: number}): Promise<number>;
    getCredits(args: { userId: string }): Promise<number>;
}