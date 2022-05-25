//for external purposes - exposed to API
export enum ExternalCommand {
  start_fetching = 'start_fetching',
  fetch_protocols = 'fetch_protocols',
  parse_protocols_main_page = 'parse_protocols_main_page',
  parse_protocols_app_page = 'parse_protocols_app_page',
  parse_protocols_docs_page = 'parse_protocols_docs_page',
  parse_protocols_github_page = 'parse_protocols_github_page',
  crawl_html = 'crawl_html',
  fetch_abi = 'fetch_abi',
  analyse_contracts = 'analyse_contracts',
  analyse_contracts_against_templates = 'analyse_contracts_against_templates',
}

//for internal purposes
export enum InternalCommand {
  contract_analyse = 'contract_analyse',
  protocol_analyse = 'protocol_analyse',
}

export type CommandType = ExternalCommand | InternalCommand;
