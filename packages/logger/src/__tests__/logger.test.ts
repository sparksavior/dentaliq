import { describe, it, expect } from "vitest";
import { createLogger, logger } from "../index";

describe("createLogger", () => {
  it("returns a pino logger instance with the given service name", () => {
    const log = createLogger("test-service");
    expect(log).toBeDefined();
    expect(typeof log.info).toBe("function");
    expect(typeof log.error).toBe("function");
    expect(typeof log.warn).toBe("function");
    expect(typeof log.debug).toBe("function");
  });

  it("creates loggers with different service names", () => {
    const log1 = createLogger("service-a");
    const log2 = createLogger("service-b");
    expect(log1).not.toBe(log2);
  });

  it("exports a default logger instance", () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe("function");
  });
});
