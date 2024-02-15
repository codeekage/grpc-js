export class GrpcError implements Error {
  constructor(
    public message: string,
    public httpCode: number,
    public grpcCode: number
  ) {
    this.name = 'GrpcError'
    this.stack = new Error().stack
    this.code = grpcCode
    this.timestamps = new Date()
  }
  name: string
  stack?: string
  code?: number
  timestamps: Date
}

export class BadRequestError extends GrpcError {
  constructor(message?: string, httpCode = 400, grpcCode = 0) {
    super(message || 'Bad request', httpCode, grpcCode)
    this.name = 'BadRequestError'
  }
}

export class UnauthorizedError extends GrpcError {
  constructor(message?: string, httpCode = 401, grpcCode = 0) {
    super(message || 'Unauthorized', httpCode, grpcCode)
    this.name = 'UnauthorizedError'
  }
}

export class NotFoundError extends GrpcError {
  constructor(message = 'Not found', httpCode = 404, grpcCode = 0) {
    super(message, httpCode, grpcCode)
    this.name = 'NotFoundError'
  }
}

export class InternalServerError extends GrpcError {
  constructor(message = 'Internal server error', httpCode = 500, grpcCode = 0) {
    super(message, httpCode, grpcCode)
    this.name = 'InternalServerError'
  }
}
