import { expect } from "vitest";
import { allCustomMatcher } from "aws-sdk-client-mock-vitest";
import * as matchers from '@testing-library/jest-dom/matchers';

// Register all AWS SDK mock custom matchers
expect.extend(allCustomMatcher);

// Register DOM testing library matchers
expect.extend(matchers);
