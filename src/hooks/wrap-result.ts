import type { HookContext, NextFunction } from '../declarations'

export const wrapResult = async (context: HookContext, next: NextFunction) => {
  // Execute the logic
  await next()

  // 1. Skip if it's an internal call (provider is empty/undefined)
  if (!context.params.provider) {
    return
  }

  // 2. Skip if it's already an error or there's no result at all
  if (context.result === undefined || context.result === null) {
    return
  }

  // 3. Skip if it's already wrapped (has 'status' property)
  if (typeof context.result === 'object' && context.result !== null && 'status' in context.result) {
    return
  }

  // 4. Wrap the successful result
  // If it's a MongoDB document, we might want to ensure it's a plain object
  // but usually context.result is already processed by resolvers/hooks.
  const originalResult = context.result

  context.result = {
    status: 200, // Business success status
    message: 'Success!',
    data: originalResult
  }
}

