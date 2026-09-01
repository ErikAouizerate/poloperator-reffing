import type { AnyAction, Middleware } from 'redux'

import { apiEffects } from './effects'

/**
 * Uniform async action pattern: `*_REQUESTED` → `*_START` / `*_SUCCESS` / `*_ERROR`.
 *
 * Every async flow in this codebase goes through this middleware: dispatch a
 * `*_REQUESTED` action and the middleware performs the side effect (from the
 * `apiEffects` registry), then dispatches the corresponding `*_START` /
 * `*_SUCCESS` / `*_ERROR` actions that classic reducers consume.
 */
export const apiMiddleware: Middleware = () => (next) => (action) => {
  const typedAction = action as AnyAction
  const actionType: string = typedAction.type

  if (!actionType.endsWith('_REQUESTED')) {
    return next(action)
  }

  const base = actionType.replace(/_REQUESTED$/, '')

  next({ type: `${base}_START`, payload: typedAction.payload })

  const run: (payload: unknown) => Promise<unknown> =
    apiEffects[base] ?? (async (payload) => payload)

  run(typedAction.payload)
    .then((result) => {
      next({ type: `${base}_SUCCESS`, payload: result })
    })
    .catch((error: unknown) => {
      next({ type: `${base}_ERROR`, payload: error, error: true })
    })

  return undefined
}