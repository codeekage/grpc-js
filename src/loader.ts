import { ServerUnaryCall, UntypedServiceImplementation, sendUnaryData } from '@grpc/grpc-js'
import { GrpcError } from './errors'
import { formatValidationErrors } from './util'
import { ValidationError } from 'class-validator'

type GrpcResponseType = Record<any, any>
type GrpcMiddleware = Array<(call: ServerUnaryCall<any, any>) => Promise<any>> | any
type GrpcInterceptor = Array<
  (callRequest: ServerUnaryCall<any, any>, response: GrpcResponseType) => Promise<any>
>

interface ServiceControllerOptions {
  controllers: Array<new (...args: any[]) => any>
  middlewares?: GrpcMiddleware
  interceptors?: GrpcInterceptor
}

export class GrpcLoader {
  serviceName: string
  constructor(serviceName: string) {
    this.serviceName = serviceName
  }

  private async execute(functions: any[], call: ServerUnaryCall<any, any>, data = {}) {
    if (!functions) throw new GrpcError('Invalid middleware error', 500, 7)
    if (functions.length) {
      for (let index = 0; index < functions.length; index++) {
        const executor = functions[index]
        if (executor) {
          const res = await executor(call, data)
          Object.assign(data, res)
        }
      }
    }
    return data
  }

  private executeMiddleware(middlewares: GrpcMiddleware, call: ServerUnaryCall<any, any>) {
    return this.execute(middlewares, call)
  }

  private executeInterceptors(
    interceptors: GrpcInterceptor,
    call: ServerUnaryCall<any, any>,
    response: GrpcResponseType
  ) {
    return this.execute(interceptors, call, response)
  }

  private rpcConverter(
    controller: Record<any, any>,
    controllerPrototype: Object,
    middlewares?: GrpcMiddleware,
    interceptors?: GrpcInterceptor
  ): UntypedServiceImplementation {
    const convertedProcedures: any = {}
    Object.entries(controllerPrototype).forEach(([functionName]) => {
      convertedProcedures[functionName] = async (
        call: ServerUnaryCall<any, any>,
        respond: sendUnaryData<any>
      ) => {
        try {
          if (middlewares && middlewares.length) await this.executeMiddleware(middlewares, call)
          let data = await controller[functionName](call)
          if (interceptors && interceptors.length) {
            data = await this.executeInterceptors(interceptors, call, data)
          }
          if (!data.data) data.data = data
          return respond(null, data)
        } catch (err: any) {
          err.error ?? err.name
          if (err instanceof GrpcError && err?.grpcCode !== 0) {
            return respond(err)
          }
          if (Array.isArray(err) && err?.[0] instanceof ValidationError) {
            return respond(null, {
              message: 'Validation error',
              errors: formatValidationErrors(err),
            })
          }
          if (!err.errors || err.errors.length) err.errors = []
          return respond(null, err)
        }
      }
    })
    return convertedProcedures
  }

  loadRPC(options: ServiceControllerOptions): UntypedServiceImplementation {
    const { controllers, middlewares, interceptors } = options
    const procedure = {}
    controllers.forEach((controller) => {
      const convertedProcedures = this.rpcConverter(
        new controller(),
        controller.prototype,
        middlewares,
        interceptors
      )
      Object.assign(procedure, convertedProcedures)
    })
    return procedure
  }
}
