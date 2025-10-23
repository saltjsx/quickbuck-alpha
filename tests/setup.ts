import { expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Cleanup after each test case
afterEach(() => {
  cleanup();
});

// Mock environment variables
process.env.QUICKBUCK_START_BALANCE = "10000000"; // $100,000 in cents
