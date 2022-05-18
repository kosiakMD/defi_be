import { Injectable } from '@nestjs/common';

import { TaskAbortError } from '../../common/errors/task.abort.error';

@Injectable()
export class TasksAbortChecker {
  private abortFlag = false;

  abortTask() {
    this.abortFlag = true;
  }

  ensureTaskNotAborted() {
    if (this.abortFlag) {
      this.abortFlag = false;
      throw new TaskAbortError();
    }
  }
}
