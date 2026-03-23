import type { HookContext, NextFunction } from '../declarations'

export const wrapResult = async (context: HookContext, next: NextFunction) => {
  await next()

  // Only wrap if it's an external call (provider is set) and successful result
  if (!context.params.provider || !context.result) {
    return
  }

  // Only wrap if it's a successful response and not already wrapped
  if (typeof context.result === 'object' && !context.result.status) {
    context.result = {
      status: 200,
      message: 'Success!',
      data: context.result
    }
  }
}
