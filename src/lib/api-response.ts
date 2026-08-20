import { NextResponse } from 'next/server';
import type { ApiError, PaginatedResponse } from '@/types';

type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'PAYLOAD_TOO_LARGE'
  | 'INTERNAL_SERVER_ERROR'
  | 'VIDEO_NOT_FOUND'
  | 'USER_NOT_FOUND'
  | 'COMMENT_NOT_FOUND'
  | 'RATING_NOT_FOUND'
  | 'CREATOR_NOT_FOUND'
  | 'EMAIL_EXISTS'
  | 'SEARCH_QUERY_REQUIRED'
  | 'RATING_EXISTS'
  | 'INVALID_FILE_TYPE'
  | 'FILE_TOO_LARGE'
  | 'LAST_ADMIN'
  | 'UPLOAD_EXPIRED';

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  UNAUTHORIZED: 'Authentication is required.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION_ERROR: 'The provided input is invalid.',
  CONFLICT: 'A conflict occurred with the current state.',
  PAYLOAD_TOO_LARGE: 'The uploaded file exceeds the maximum allowed size.',
  INTERNAL_SERVER_ERROR: 'An internal server error occurred.',
  VIDEO_NOT_FOUND: 'The requested video could not be found.',
  USER_NOT_FOUND: 'The requested user could not be found.',
  COMMENT_NOT_FOUND: 'The requested comment could not be found.',
  RATING_NOT_FOUND: 'No rating found for this video by the current user.',
  CREATOR_NOT_FOUND: 'The requested creator could not be found.',
  EMAIL_EXISTS: 'A user with this email already exists.',
  SEARCH_QUERY_REQUIRED: 'At least one search parameter is required.',
  RATING_EXISTS: 'You have already rated this video. Use PATCH to update.',
  INVALID_FILE_TYPE: 'The file type is not allowed.',
  FILE_TOO_LARGE: 'The file exceeds the maximum allowed size.',
  LAST_ADMIN: 'Cannot disable the last admin account.',
  UPLOAD_EXPIRED: 'The upload session has expired.',
};

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function apiCreated<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export function apiNoContent() {
  return new NextResponse(null, { status: 204 });
}

export function apiPaginated<T>(data: T[], page: number, limit: number, total: number): NextResponse<PaginatedResponse<T>> {
  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export function apiError(code: ErrorCode, message?: string, details?: unknown, status?: number): NextResponse<ApiError> {
  const statusMap: Record<ErrorCode, number> = {
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    VALIDATION_ERROR: 422,
    CONFLICT: 409,
    PAYLOAD_TOO_LARGE: 413,
    INTERNAL_SERVER_ERROR: 500,
    VIDEO_NOT_FOUND: 404,
    USER_NOT_FOUND: 404,
    COMMENT_NOT_FOUND: 404,
    RATING_NOT_FOUND: 404,
    CREATOR_NOT_FOUND: 404,
    EMAIL_EXISTS: 409,
    SEARCH_QUERY_REQUIRED: 422,
    RATING_EXISTS: 409,
    INVALID_FILE_TYPE: 422,
    FILE_TOO_LARGE: 413,
    LAST_ADMIN: 409,
    UPLOAD_EXPIRED: 410,
  };

  return NextResponse.json(
    {
      error: {
        code,
        message: message || ERROR_MESSAGES[code],
        details,
      },
    },
    { status: status || statusMap[code] }
  );
}
