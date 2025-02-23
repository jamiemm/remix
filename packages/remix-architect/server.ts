import type {
  AppLoadContext,
  ServerBuild,
  RequestInit as NodeRequestInit,
  Response as NodeResponse,
} from "@remix-run/node";
import {
  AbortController as NodeAbortController,
  Headers as NodeHeaders,
  Request as NodeRequest,
  createRequestHandler as createRemixRequestHandler,
  readableStreamToString,
} from "@remix-run/node";
import type {
  APIGatewayProxyEventHeaders,
  APIGatewayProxyEvent,
  APIGatewayProxyEventV2,
  APIGatewayProxyHandler,
  APIGatewayProxyHandlerV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";

import { isBinaryType } from "./binaryTypes";
import {
  sendRemixResponse as sendRemixResponseV2,
  createRemixRequest as createRemixRequestV2
} from "./api/v2";
import {
  createRemixRequest,
  sendRemixResponse
} from "./api/v1";

export enum APIGatewayVersion {
  v1 = "v1",
  v2 = "v2",
}
/**
 * A function that returns the value to use as `context` in route `loader` and
 * `action` functions.
 *
 * You can think of this as an escape hatch that allows you to pass
 * environment/platform-specific values through to your loader/action.
 */
export type GetLoadContextFunction = (
  event: APIGatewayProxyEventV2 | APIGatewayProxyEvent
) => AppLoadContext;

export type RequestHandler = APIGatewayProxyHandlerV2 | APIGatewayProxyHandler;

/**
 * Returns a request handler for Architect that serves the response using
 * Remix.
 */
export function createRequestHandler({
  build,
  getLoadContext,
  mode = process.env.NODE_ENV,
}: {
  build: ServerBuild;
  getLoadContext?: GetLoadContextFunction;
  mode?: string;
  apiGatewayVersion = APIGatewayVersion.v2;
}): RequestHandler {
  let handleRequest = createRemixRequestHandler(build, mode);

  return async (event: APIGatewayProxyEvent | APIGatewayProxyEventV2 /*, context*/) => {
    let request = apiGatewayVersion === APIGatewayVersion.v1
      ? createRemixRequest(event as APIGatewayProxyEvent)
      : createRemixRequestV2(event as APIGatewayProxyEventV2);
    let loadContext = getLoadContext?.(event);

    let response = (await handleRequest(request, loadContext)) as NodeResponse;

    return apiGatewayVersion === APIGatewayVersion.v1
      ? sendRemixResponse(response)
      : sendRemixResponseV2(response);
  };
}
