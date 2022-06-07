export function formatError(e) {
  return {
    error: e.toString(),
    stack: e.stack?.toString().replace(/\r\n/, ''),
  };
}
