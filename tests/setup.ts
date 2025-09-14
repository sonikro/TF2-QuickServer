import { expect } from "vitest";
import { allCustomMatcher } from "aws-sdk-client-mock-vitest";

// Register all AWS SDK mock custom matchers
expect.extend(allCustomMatcher);
