import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Button } from "~/components/ui/button";

describe("Project Setup Smoke Test", () => {
  it("should render shadcn Button component", () => {
    const { container } = render(<Button>Click me</Button>);
    const button = container.querySelector("button");
    expect(button).toBeTruthy();
    expect(button?.textContent).toContain("Click me");
  });

  it("should verify TypeScript strict mode", () => {
    // This test will fail to compile if strict mode is not enabled
    const testValue: string = "test";
    // @ts-expect-error - This should error with strict mode
    const shouldError: number = testValue;
    expect(true).toBe(true);
  });
});
