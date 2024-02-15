import { ValidationError } from "class-validator"

export function formatValidationErrors(
    errors: ValidationError[],
    parentPath = ''
  ): string[] {
    const errorMessages: any[] = []
  
    for (const error of errors) {
      if (error.constraints) {
        errorMessages.push({
          field: `${parentPath}${error.property}`,
          message: Object.values(error.constraints).join(' | '),
        })
      }
  
      if (error.children?.length) {
        const nestedErrors = formatValidationErrors(
          error.children,
          `${parentPath}${error.property}.`
        )
        errorMessages.push(...nestedErrors)
      }
    }
    return errorMessages
  }
  