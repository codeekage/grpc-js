import {
  GrpcObject,
  ServerUnaryCall,
  ServiceDefinition,
  UntypedServiceImplementation,
} from '@grpc/grpc-js'

export type GrpcResponseType = Record<any, any>
export type GrpcMiddleware = Array<(call: ServerUnaryCall<any, any>) => Promise<any>> | any
export type GrpcInterceptor = Array<
  (callRequest: ServerUnaryCall<any, any>, response: GrpcResponseType) => Promise<any>
>
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
