import { afterEach } from "vitest";

afterEach(async () => {
  // Only unmount React trees in DOM-based test files.
  if (typeof document !== "undefined") {
    const { cleanup } = await import("@testing-library/react");
    cleanup();
  }
});
