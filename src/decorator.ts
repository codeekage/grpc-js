import {
  ValidationOptions,
  validateOrReject,
  ValidationArguments,
  registerDecorator,
} from 'class-validator'
import { isValidObjectId } from 'mongoose'

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

export function middleware(func: Function) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor!.value
    descriptor!.value = async function (...args: any[]) {
      await func(args[0])
      return originalMethod.apply(this, args)
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
