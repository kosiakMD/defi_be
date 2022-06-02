import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  reqId?: string;
  sessionId?: string;

  [key: string]: string;
}

export const globalStore = new AsyncLocalStorage<RequestContext>();

// Allows easy access to a request's context
export const ctx = (): RequestContext => {
  const context = globalStore.getStore();
  if (!context) {
    // throw new Error('No context attached to the current req');
  }
  return context;
};

// Allows wrapping a request in a context
export const runWithCtx = (
  fx: (ctx: RequestContext) => Promise<unknown>,
  context: RequestContext = {},
) => {
  globalStore.run(context, () => {
    return fx(ctx());
  });
};
