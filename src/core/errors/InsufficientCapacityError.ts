export class InsufficientCapacityError extends Error {
    constructor(message: string = "The region does not have sufficient capacity at this moment. Please try again later.") {
        super(message);
        this.name = "InsufficientCapacityError";
    }
}
