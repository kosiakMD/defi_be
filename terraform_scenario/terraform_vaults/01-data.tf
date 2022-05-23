data "aws_ssm_parameter" "INTEGRATION_SERVICE_URL" {
  name = upper("/${var.environment}/INTEGRATION_SERVICE_URL")
}

data "aws_ssm_parameter" "ACCOUNT_SERVICE_URL" {
  name = upper("/${var.environment}/ACCOUNT_SERVICE_URL")
}

data "aws_ssm_parameter" "AUTOFARM_API_CELO_URL" {
  name = upper("/${var.environment}/AUTOFARM_API_CELO_URL")
}

data "aws_ssm_parameter" "AUTOFARM_API_HECO_URL" {
  name = upper("/${var.environment}/AUTOFARM_API_HECO_URL")
}

data "aws_ssm_parameter" "AUTOFARM_API_CRO_URL" {
  name = upper("/${var.environment}/AUTOFARM_API_CRO_URL")
}

data "aws_ssm_parameter" "AUTOFARM_API_FTM_URL" {
  name = upper("/${var.environment}/AUTOFARM_API_FTM_URL")
}

data "aws_ssm_parameter" "AUTOFARM_API_AVAX_URL" {
  name = upper("/${var.environment}/AUTOFARM_API_AVAX_URL")
}

data "aws_ssm_parameter" "AUTOFARM_API_XDAI_URL" {
  name = upper("/${var.environment}/AUTOFARM_API_XDAI_URL")
}

data "aws_ssm_parameter" "AUTOFARM_API_HARM_URL" {
  name = upper("/${var.environment}/AUTOFARM_API_HARM_URL")
}

data "aws_ssm_parameter" "AUTOFARM_API_URL" {
  name = upper("/${var.environment}/AUTOFARM_API_URL")
}

data "aws_ssm_parameter" "AUTOFARM_API_OKEX_URL" {
  name = upper("/${var.environment}/AUTOFARM_API_OKEX_URL")
}

data "aws_ssm_parameter" "AUTOFARM_API_MRIVER_URL" {
  name = upper("/${var.environment}/AUTOFARM_API_MRIVER_URL")
}

data "aws_ssm_parameter" "SUNDAESWAP_URL" {
  name = upper("/${var.environment}/SUNDAESWAP_URL")
}

data "aws_ssm_parameter" "ETH_URL" {
  name = upper("/${var.environment}/ETH_URL")
}

data "aws_ssm_parameter" "TRADERJOE_SUBGRAPH_URL" {
  name = upper("/${var.environment}/TRADERJOE_SUBGRAPH_URL")
}

data "aws_ssm_parameter" "HECO_URL" {
  name = upper("/${var.environment}/HECO_URL")
}

data "aws_ssm_parameter" "CELO_URL" {
  name = upper("/${var.environment}/CELO_URL")
}

data "aws_ssm_parameter" "AURORA_URL" {
  name = upper("/${var.environment}/AURORA_URL")
}

data "aws_ssm_parameter" "AVAX_URL" {
  name = upper("/${var.environment}/AVAX_URL")
}

data "aws_ssm_parameter" "SOL_URL" {
  name = upper("/${var.environment}/SOL_URL")
}

data "aws_ssm_parameter" "XDAI_URL" {
  name = upper("/${var.environment}/XDAI_URL")
}

data "aws_ssm_parameter" "PRICE_SERVICE_URL" {
  name = upper("/${var.environment}/PRICE_SERVICE_URL")
}

data "aws_ssm_parameter" "TERRA_URL" {
  name = upper("/${var.environment}/TERRA_URL")
}

data "aws_ssm_parameter" "OPT_URL" {
  name = upper("/${var.environment}/OPT_URL")
}

data "aws_ssm_parameter" "CRONOS_URL" {
  name = upper("/${var.environment}/CRONOS_URL")
}

data "aws_ssm_parameter" "KCC_URL" {
  name = upper("/${var.environment}/KCC_URL")
}

data "aws_ssm_parameter" "HARM_URL" {
  name = upper("/${var.environment}/HARM_URL")
}

data "aws_ssm_parameter" "BOBA_URL" {
  name = upper("/${var.environment}/BOBA_URL")
}

data "aws_ssm_parameter" "OKEX_URL" {
  name = upper("/${var.environment}/OKEX_URL")
}

data "aws_ssm_parameter" "GNOSIS_URL" {
  name = upper("/${var.environment}/GNOSIS_URL")
}

data "aws_ssm_parameter" "MRIVER_URL" {
  name = upper("/${var.environment}/MRIVER_URL")
}

data "aws_ssm_parameter" "POLYGON_URL" {
  name = upper("/${var.environment}/POLYGON_URL")
}

data "aws_ssm_parameter" "ARBITRUM_URL" {
  name = upper("/${var.environment}/ARBITRUM_URL")
}

data "aws_ssm_parameter" "BSC_URL" {
  name = upper("/${var.environment}/BSC_URL")
}

data "aws_ssm_parameter" "FTM_URL" {
  name = upper("/${var.environment}/FTM_URL")
}

data "aws_ssm_parameter" "DB_HOST" {
  name = upper("/${var.environment}/DB_HOST")
}

data "aws_ssm_parameter" "DB_SYNCHRONIZE" {
  name = upper("/${var.environment}/DB_SYNCHRONIZE")
}

data "aws_ssm_parameter" "DB_DATABASE" {
  name = upper("/${var.environment}/DB_DATABASE")
}

data "aws_ssm_parameter" "DB_PORT" {
  name = upper("/${var.environment}/DB_PORT")
}

data "aws_ssm_parameter" "DB_LOGGING" {
  name = upper("/${var.environment}/DB_LOGGING")
}

data "aws_ssm_parameter" "DB_CONNECTION" {
  name = upper("/${var.environment}/DB_CONNECTION")
}

data "aws_ssm_parameter" "DB_USERNAME" {
  name = upper("/${var.environment}/DB_USERNAME")
}

data "aws_ssm_parameter" "DB_PASSWORD" {
  name = upper("/${var.environment}/DB_PASSWORD")
}

data "aws_ssm_parameter" "MINSWAP_URL" {
  name = upper("/${var.environment}/MINSWAP_URL")
}

data "aws_ssm_parameter" "SOLANA_TOKENS_PUBLIC_API" {
  name = upper("/${var.environment}/SOLANA_TOKENS_PUBLIC_API")
}

data "aws_ssm_parameter" "SONAR_FARMS_PUBLIC_API" {
  name = upper("/${var.environment}/SONAR_FARMS_PUBLIC_API")
}

data "aws_ssm_parameter" "SONAR_POOLS_PUBLIC_API" {
  name = upper("/${var.environment}/SONAR_POOLS_PUBLIC_API")
}

data "aws_ssm_parameter" "WINGRIDERS_AGGREGATOR_URL" {
  name = upper("/${var.environment}/WINGRIDERS_AGGREGATOR_URL")
}

data "aws_ssm_parameter" "WINGRIDERS_EXPLORER_URL" {
  name = upper("/${var.environment}/WINGRIDERS_EXPLORER_URL")
}

data "aws_ssm_parameter" "CARDANO_BLOCKFROST_API_KEY" {
  name = upper("/${var.environment}/CARDANO_BLOCKFROST_API_KEY")
}

data "aws_ssm_parameter" "CHAIN_IDS" {
  name = upper("/${var.environment}/CHAIN_IDS")
}
