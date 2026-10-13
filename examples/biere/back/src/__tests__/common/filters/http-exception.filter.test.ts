import { BadRequestException, HttpException, HttpStatus, Logger, NotFoundException } from "@nestjs/common";
import type { ArgumentsHost } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpExceptionFilter } from "@/common/filters/http-exception.filter";

const createHost = () => {
  const response = { status: vi.fn(), json: vi.fn() };
  response.status.mockReturnValue(response);
  const host = { switchToHttp: () => ({ getResponse: () => response }) } as unknown as ArgumentsHost;
  return { host, response };
};

describe("HttpExceptionFilter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps the status and the string message of an HttpException", () => {
    const { host, response } = createHost();

    new HttpExceptionFilter().catch(new NotFoundException("Beer 7 not found."), host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(response.json).toHaveBeenCalledWith({ message: "Beer 7 not found." });
  });

  it("joins an array message into one string", () => {
    const { host, response } = createHost();

    new HttpExceptionFilter().catch(new BadRequestException(["a is invalid", "b is invalid"]), host);

    expect(response.json).toHaveBeenCalledWith({ message: "a is invalid; b is invalid" });
  });

  it("uses a raw string response as the message", () => {
    const { host, response } = createHost();

    new HttpExceptionFilter().catch(new HttpException("Payload too large", HttpStatus.PAYLOAD_TOO_LARGE), host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.PAYLOAD_TOO_LARGE);
    expect(response.json).toHaveBeenCalledWith({ message: "Payload too large" });
  });

  it("falls back to the exception message when the response object has no message", () => {
    const { host, response } = createHost();

    new HttpExceptionFilter().catch(new HttpException({ code: 42 }, HttpStatus.CONFLICT), host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(response.json).toHaveBeenCalledWith({ message: "Http Exception" });
  });

  it("logs an unexpected error and answers 500 with a generic message", () => {
    const { host, response } = createHost();
    const log = vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);

    new HttpExceptionFilter().catch(new Error("secret"), host);
    new HttpExceptionFilter().catch("not an error", host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.json).toHaveBeenCalledWith({ message: "Internal error" });
    expect(log).toHaveBeenCalledTimes(2);
  });
});
