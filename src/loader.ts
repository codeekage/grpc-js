import { ServerUnaryCall, UntypedServiceImplementation, sendUnaryData } from '@grpc/grpc-js'
import { GrpcError } from './errors'
import { formatValidationErrors, setFieldToNewField } from './util'
import { ValidationError } from 'class-validator'
// import { Logger } from './logger'
import { GrpcInterceptor, GrpcMiddleware, GrpcRequestContext, GrpcResponseType } from 'interface'
import Container, { Service, Inject } from 'typedi'
import pino from 'pino'
import { randomUUID } from 'crypto'
import { createLogger } from './pinoLogger'

interface ServiceControllerOptions {
  controllers: Array<new (...args: any[]) => any>
  middlewares?: GrpcMiddleware
  interceptors?: GrpcInterceptor
}

export class GrpcLoader {
  serviceName: string
  logger: pino.Logger
  constructor(serviceName: string) {
    this.serviceName = serviceName
    //   this.logger = new Logger(this.serviceName)
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
    Object.entries(controllerPrototype).forEach(([functionName], index) => {
      // cast function name to get
      convertedProcedures[functionName] = async (
        call: ServerUnaryCall<any, any>,
        respond: sendUnaryData<any>
      ) => {
        const funcName = Object.keys(convertedProcedures)[index]

        const trace = randomUUID()

        Container.set('request-context', {
          service: this.serviceName,
          rpc: funcName,
          trace,
          request: call.request,
        })

        const parentLogger = createLogger({
          name: this.serviceName
        })

        this.logger = parentLogger.child(parentLogger, {
          formatters: {
            bindings: (bindings) => ({
              service: this.serviceName,
              pid: bindings.pid,
              host: bindings.hostname,
              rpc: funcName,
              trace,
              levels: undefined, values: undefined
            })
          }
        })

        call.request.body = call.request
        try {
          call.request.logger = this.logger
          call.request.getContext = Container.get<GrpcRequestContext>('request-context')


          this.logger.info({ request: call.request.body }, 'Incoming Request')
          if (middlewares && middlewares.length) await this.executeMiddleware(middlewares, call)

          let data = await controller[functionName](call)
          if (interceptors && interceptors.length) {
            data = await this.executeInterceptors(interceptors, call, data)
          }
          if (!data) data = {}
          this.logger.info({
            response: data,
            msg: 'Request completed'
          })
          return respond(null, { status: 'successful', success: true, data: setFieldToNewField(data, '_id', 'id'), message: data.message })
        } catch (err: any) {
          if (interceptors) {
            err = await this.executeInterceptors(interceptors, call, err)
          }
          err.error = err.name
          err.status = 'failed'
          this.logger.error(err, {
            request: call.request.body,
          })
          if (err instanceof GrpcError && err?.grpcCode !== 0) {
            return respond(err)
          }
          if (Array.isArray(err) && err?.[0] instanceof ValidationError) {
            return respond(null, {
              success: false,
              status: 'failed',
              error: 'ValidationError',
              message: 'Validation error',
              errors: formatValidationErrors(err),
            })
          }
          if (!err.errors || !err.errors.length) err.errors = []
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

  loadController(options: ServiceControllerOptions): UntypedServiceImplementation {
    const { controllers, middlewares, interceptors } = options
    const procedure = {}
    controllers.forEach((controller) => {
      const convertedProcedures = this.rpcConverter(
        Container.get<typeof controller>(controller),
        controller.prototype,
        middlewares,
        interceptors
      )
      Object.assign(procedure, convertedProcedures)
    })
    return procedure
  }
}

Container.set('logger-context', createLogger({}))

export { Container as GrpcContainer, Inject as GrpcContainerInject, Service as GrpcContainerService }