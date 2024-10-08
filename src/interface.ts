import {
  GrpcObject,
  ServerUnaryCall,
  ServiceDefinition,
  UntypedServiceImplementation,
} from '@grpc/grpc-js'
import pino from 'pino'

export type GrpcResponseType = Record<any, any>
export type GrpcMiddleware = Array<(call: ServerUnaryCall<any, any>) => Promise<any>> | any
export type GrpcInterceptor = Array<
  (callRequest: ServerUnaryCall<any, any>, response: GrpcResponseType) => Promise<any>
>

export type GrpcLogger = pino.Logger

export type GrpcRequest<T> = {
  readonly body?: T;
  readonly logger?: GrpcLogger;
  readonly getContext?: GrpcRequestContext;
} & T

export type GrpcRequestContext = {
  service: string
  rpc: string
  trace: string
  request: Record<string, unknown>
} & Record<string, unknown>

interface GrpcPack {
  com: {
    pkg: {
      [k: string]: {
        [k: string]: {
          service: ServiceDefinition<UntypedServiceImplementation>
        }
      }
    }
  }
}
export type GrpcPackage = GrpcObject & GrpcPack
