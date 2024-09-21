import {
  ValidationOptions,
  validateOrReject,
  ValidationArguments,
  registerDecorator,
} from 'class-validator'
import { GrpcContainer } from './loader'
import { isValidObjectId } from 'mongoose'
import EventEmitter from 'stream'

interface EventOptions {
  suppressErrorEvent?: boolean
  successEventTopic?: string,
  errorEventTopic?: string
}

export function validate(object: any) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor!.value
    descriptor!.value = async function (...args: any[]) {
      const targ = new object()
      Object.assign(targ, args[0].request)
      await validateOrReject(targ)
      return originalMethod.apply(this, args)
    }
    return descriptor
  }
}

export function middleware(...funcs: Function[]) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor!.value
    descriptor!.value = async function (...args: any[]) {
      for (const func of funcs) {
        await func(args[0])
      }
      return originalMethod.apply(this, args)
    }
    return descriptor
  }
}


export function event(topic?: string, options?: EventOptions): MethodDecorator {
  return function (target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>) {
    const originalMethod = descriptor!.value

    descriptor!.value = async function (...args: any[]) {

      const eventHandler = GrpcContainer.get<EventEmitter>('eventHandler')

      if (!eventHandler) throw new Error('EventEmitter not set')

      if (!topic && !options?.successEventTopic) throw new Error('At least a topic or successEventTopic must be set')

      let eventName = topic

      const result = originalMethod.apply(this, args)

      let payload
      try {
        payload = await result
        eventName = topic?.concat('.successful')
        if (options?.successEventTopic) eventName = options?.successEventTopic

      } catch (error: any) {
        payload = {
          errorMessage: error.message
        }
        eventName = topic?.concat('.errored')
        if (options?.errorEventTopic) eventName = options?.errorEventTopic
      }

      if (payload.errorMessage && options?.suppressErrorEvent) return result

      process.stdout.write(`@event trigged on  ${eventName}\n ${JSON.stringify(payload)}`)

      eventHandler.emit(eventName!, payload)

      process.stdout.write(`@event emitted on  ${eventName} \n`)

      return result
    }

    return descriptor
  }
}

export function IsMongoId(property?: string, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidBase64',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return isValidObjectId(value)
        },
        defaultMessage(validationArguments) {
          return `Invalid ${propertyName} id, please check the id and try again`
        },
      },
    })
  }
}
