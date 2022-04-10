import { ApprovalsSortFieldsEnum } from '../enum/ApprovalsSortFields.enum';

export interface GetAllApprovalsInterface {
  address: string;
  sortField: ApprovalsSortFieldsEnum;
}
