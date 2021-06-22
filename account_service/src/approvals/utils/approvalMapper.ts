const ApprovalMapper = (approvals: Array<any>, chainId: number): Array<any> => {
  let resp = [];
  for (const row of approvals) {
    resp = [...resp, {
      chainId: chainId,
      allowance: row.amount,
      blockNumber: Number(row.block_number),
      blockTimestamp: Number(row.block_timestamp),
      project: {
        id: row.project_id ? Number(row.project_id) : row.project_id,
        name: row.project_name,
        icon: row.icon,
        description: row.description,
      },
      spender: row.contract_address,
      token: {
        id: row.token_address,
        icon: row.token_icon,
        name: row.token_name,
        symbol: row.token_symbol,
        decimals: row.token_decimal,
      },
    }]
  }
  return resp;
};

export default ApprovalMapper;
