import {
  ServerUnaryCall,
  UntypedServiceImplementation,
  sendUnaryData,
} from '@grpc/grpc-js'
import { GrpcError } from './errors'
import { formatValidationErrors } from './util'
import { ValidationError } from 'class-validator'

interface ServiceControllerOptions {
  controllers: Array<new (...args: any[]) => any>
  middlewares: Function[]
}

export class GrpcLoader {
  serviceName: string
  constructor(serviceName: string) {
    this.serviceName = serviceName
  }

  private executeMiddleware(middlewares: Function[], call: any) {
    if (middlewares.length) {
      for (let index = 0; index < middlewares.length; index++) {
        const middleware = middlewares[index]
        middleware(call)
      }
    }
    return
  }

  private rpcConverter(
    controller: Record<any, any>,
    controllerPrototype: Object,
    middlewares: Function[]
  ): UntypedServiceImplementation {
    const convertedProcedures: any = {}
    Object.entries(controllerPrototype).forEach(([functionName]) => {
      convertedProcedures[functionName] = async (
        call: ServerUnaryCall<any, any>,
        respond: sendUnaryData<any>
      ) => {
        try {
          this.executeMiddleware(middlewares, call)
          const data = await controller[functionName](call)
          return respond(null, data)
        } catch (err) {
          if (err instanceof GrpcError && err?.grpcCode !== 0) {
            return respond(err)
          }
          if (Array.isArray(err) && err?.[0] instanceof ValidationError) {
            return respond(null, {
              message: 'Validation error',
              errors: formatValidationErrors(err),
            })
          }
          return respond(null, err)
        }
      }
    })
    return convertedProcedures
  }

  loadRPC(options: ServiceControllerOptions): UntypedServiceImplementation {
    const { controllers, middlewares } = options
    const procedure = {}
    controllers.forEach((controller) => {
      const convertedProcedures = this.rpcConverter(
        new controller(),
        controller.prototype,
        middlewares
      )
      Object.assign(procedure, convertedProcedures)
    })
    return procedure
  }
}
