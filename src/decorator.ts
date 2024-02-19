import { validateOrReject } from 'class-validator'

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
