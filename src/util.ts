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

// Function to set a field 'x' to a new field 'y' in an object, handling nested objects, arrays, and circular references
export function setFieldToNewField<T extends Record<string, any>>(obj: T, x: string, y: string): T {
  const seenObjects = new WeakSet() // To track visited objects and avoid circular references

  // Helper function to handle traversal iteratively
  function traverseAndSet(obj: any): any {
    const stack = [{ current: obj, parent: null, key: null }] as any[]

    while (stack.length) {
      const { current } = stack.pop()!

      if (typeof current === 'object' && current !== null) {
        if (seenObjects.has(current)) {
          // Skip circular references
          continue
        }
        seenObjects.add(current)

        // Handle array elements
        if (Array.isArray(current)) {
          current.forEach((item, index) => {
            stack.push({ current: item, parent: current, key: index })
          })
        } else {
          // Handle object properties
          for (const prop in current) {
            if (current.hasOwnProperty(prop)) {
              stack.push({ current: current[prop], parent: current, key: prop })

              // Set 'y' field if 'x' field is found
              if (prop === x) {
                current[y] = current[x]
              }
            }
          }
        }
      }
    }

    return obj
  }

  // Start the traversal from the root object
  return traverseAndSet(obj)
}
