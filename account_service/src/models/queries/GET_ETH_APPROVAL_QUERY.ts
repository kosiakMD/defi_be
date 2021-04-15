const ethApprovals = (): string => {
  return `
			select a.token_address           as token_address,
               a.contract_address        as contract_address,
               a.amount          as amount,
               a.block_number    as block_number,
               a.block_timestamp as block_timestamp,
               pc.project_id,
               pi.name as project_name,
               pi.description,
               pi.icon_project as icon,
               pt.img_path as token_icon,
               pt.name as token_name,
               pt.symbol as token_symbol,
               pt.decimals as token_decimal
			from approvals a
					left join projects_contract pc on a.contract_address = pc.address
					left join projects_info pi on pc.project_id = pi.id
					left join approvals_tokens pt on a.token_address = pt.address
			where a.id in (
				select
					MAX(a.id)
				from approvals a
				where user_address = $1
				group by a.token_address, a.contract_address
			)`;
};

export default ethApprovals;
