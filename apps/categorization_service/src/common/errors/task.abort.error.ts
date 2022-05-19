export class TaskAbortError extends Error {
  constructor(message = 'task was aborted') {
    super(message);
  }
}
