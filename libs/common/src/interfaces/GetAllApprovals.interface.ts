import { ApprovalsSortFieldsEnum } from '@app/common/enum/ApprovalsSortFields.enum';

export interface GetAllApprovalsInterface {
  address: string;
  sortField: ApprovalsSortFieldsEnum;
}
