const ApprovalMapper = (approvals: Array<any>, chainId: number): Array<any> => {
  const resp = [];
  let i = 0;
  for (const row of approvals) {
    i++;
    const tmp: any = {
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
    };

    if (i === 1) {
      resp.push(tmp);
    } else {
      let x = true;

      for (const e of resp) {
        if (e.spender === tmp.spender && e.token.name === tmp.token.name) {
          if (tmp.block_number > e.block_number) {
            e.spender = tmp.spender;
            e.blockNumber = tmp.blockNumber;
            e.blockTimestamp = tmp.blockTimestamp;
            e.allowance = tmp.allowance;
            e.project = tmp.project;
          }
          x = false;
        }
      }
      if (x != false) {
        resp.push(tmp);
      }
    }
  }
  return resp;
};

export default ApprovalMapper;
