/**
 * Error thrown when AWS does not have sufficient capacity to launch EC2 instances.
 * 
 * This error is specifically designed for capacity-related failures in AWS regions,
 * particularly in AWS Local Zones where capacity constraints are more common.
 * 
 * The error includes contextual information such as the region and instance type
 * to help with debugging and user communication.
 * 
 * ## User Experience
 * 
 * When this error is thrown, the command error handler displays a friendly message
 * to users explaining:
 * - The nature of the capacity issue
 * - That it's temporary and on AWS's side
 * - Suggestions for what to do next (retry, try different region, etc.)
 * 
 * ## Example Usage
 * 
 * ```typescript
 * throw new InsufficientCapacityError(
 *   "Unable to launch instance. AWS capacity exhausted.",
 *   Region.US_EAST_1_BUE_1A,
 *   _InstanceType.t3_medium
 * );
 * ```
 * 
 * @see commandErrorHandler for how this error is presented to users
 */
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
