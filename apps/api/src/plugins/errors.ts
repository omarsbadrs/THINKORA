import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { ValidationError } from '../lib/request-validation.js';

interface ErrorResponse {
  error: string;
  code: string;
  status: number;
  details?: unknown;
}

async function errorsPlugin(fastify: FastifyInstance): Promise<void> {
  fastify.setErrorHandler((error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply) => {
    const response: ErrorResponse = {
      error: 'Internal Server Error',
      code: 'INTERNAL_ERROR',
      status: 500,
    };

    // Zod validation errors
    if (error instanceof ZodError) {
      response.error = 'Validation failed';
      response.code = 'VALIDATION_ERROR';
      response.status = 400;
      response.details = error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }));
      request.log.warn({ err: error }, 'Validation error');
      return reply.code(response.status).send(response);
    }

    // Custom ValidationError from request-validation lib
    if (error instanceof ValidationError) {
      response.error = error.message;
      response.code = 'VALIDATION_ERROR';
      response.status = 400;
      response.details = error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }));
      request.log.warn({ err: error }, 'Validation error');
      return reply.code(response.status).send(response);
    }

    // Fastify errors with statusCode
    if ('statusCode' in error && typeof error.statusCode === 'number') {
      response.status = error.statusCode;

      switch (error.statusCode) {
        case 400:
          response.error = error.message || 'Bad Request';
          response.code = 'BAD_REQUEST';
          break;
        case 401:
          response.error = error.message || 'Unauthorized';
          response.code = 'AUTH_ERROR';
          break;
        case 403:
          response.error = error.message || 'Forbidden';
          response.code = 'FORBIDDEN';
          break;
        case 404:
          response.error = error.message || 'Not Found';
          response.code = 'NOT_FOUND';
          break;
        case 409:
          response.error = error.message || 'Conflict';
          response.code = 'CONFLICT';
          break;
        case 429:
          response.error = error.message || 'Too Many Requests';
          response.code = 'RATE_LIMITED';
          break;
        default:
          response.error = error.message || 'Server Error';
          response.code = 'SERVER_ERROR';
      }

      if (error.statusCode >= 500) {
        request.log.error({ err: error }, 'Server error');
      } else {
        request.log.warn({ err: error }, 'Client error');
      }

      return reply.code(response.status).send(response);
    }

    // Unknown errors
    request.log.error({ err: error }, 'Unhandled error');
    response.error = process.env.NODE_ENV === 'production' ? 'Internal Server Error' : error.message;
    return reply.code(500).send(response);
  });

  // Handle 404 for undefined routes
  fastify.setNotFoundHandler((_request: FastifyRequest, reply: FastifyReply) => {
    reply.code(404).send({
      error: 'Route not found',
      code: 'NOT_FOUND',
      status: 404,
    });
  });
}

export default fp(errorsPlugin, {
  name: 'errors',
});
