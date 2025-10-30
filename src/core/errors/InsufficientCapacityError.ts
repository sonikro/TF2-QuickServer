export class InsufficientCapacityError extends Error {
    constructor(
        message: string,
        public readonly region: string,
        public readonly instanceType?: string
    ) {
        super(message);
        this.name = "InsufficientCapacityError";
    }
}
