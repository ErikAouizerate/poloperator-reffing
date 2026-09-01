import type { AnyAction, Middleware } from 'redux'

/**
 * Uniform async action pattern: `*_REQUESTED` → `*_START` / `*_SUCCESS` / `*_ERROR`.
 *
 * Every async flow in this codebase goes through this middleware: dispatch a
 * `*_REQUESTED` action and the middleware performs the side effect, then
 * dispatches the corresponding `*_START` / `*_SUCCESS` / `*_ERROR` actions that
 * classic reducers consume.
 */
export const apiMiddleware: Middleware = () => (next) => (action) => {
  const typedAction = action as AnyAction
  const actionType: string = typedAction.type

  if (!actionType.endsWith('_REQUESTED')) {
    return next(action)
  }

  const base = actionType.replace(/_REQUESTED$/, '')

  next({ type: `${base}_START`, payload: typedAction.payload })

  // Replace the promise below with the real API call for this action.
  Promise.resolve()
    .then(() => Promise.resolve(typedAction.payload))
    .then((payload) => {
      next({ type: `${base}_SUCCESS`, payload })
    })
    .catch((error) => {
      next({ type: `${base}_ERROR`, payload: error, error: true })
    })

  return undefined
}