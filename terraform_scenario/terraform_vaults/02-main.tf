module "lambda" {
  source                     = "../.data/modules/lambda"
  aws_region                 = var.env_region
  ecr_repository_name        = "${var.environment}_${var.lambda_name}"
  docker_image_tag           = var.image_tag
  lambda_name                = "${var.environment}_${var.lambda_name}"
  lambda_options_memory_size = "750"
  lambda_options_timeout     = "300"
  schedule                   = var.schedule_minutes
  vpc                        = var.vpc
  environment_variables = {
    "INTEGRATION_SERVICE_URL"    = data.aws_ssm_parameter.INTEGRATION_SERVICE_URL.value,
    "ACCOUNT_SERVICE_URL"        = data.aws_ssm_parameter.ACCOUNT_SERVICE_URL.value,
    "AUTOFARM_API_CELO_URL"      = data.aws_ssm_parameter.AUTOFARM_API_CELO_URL.value,
    "AUTOFARM_API_HECO_URL"      = data.aws_ssm_parameter.AUTOFARM_API_HECO_URL.value,
    "AUTOFARM_API_CRO_URL"       = data.aws_ssm_parameter.AUTOFARM_API_CRO_URL.value,
    "AUTOFARM_API_FTM_URL"       = data.aws_ssm_parameter.AUTOFARM_API_FTM_URL.value,
    "AUTOFARM_API_AVAX_URL"      = data.aws_ssm_parameter.AUTOFARM_API_AVAX_URL.value,
    "AUTOFARM_API_XDAI_URL"      = data.aws_ssm_parameter.AUTOFARM_API_XDAI_URL.value,
    "AUTOFARM_API_HARM_URL"      = data.aws_ssm_parameter.AUTOFARM_API_HARM_URL.value,
    "AUTOFARM_API_URL"           = data.aws_ssm_parameter.AUTOFARM_API_URL.value,
    "AUTOFARM_API_OKEX_URL"      = data.aws_ssm_parameter.AUTOFARM_API_OKEX_URL.value,
    "AUTOFARM_API_MRIVER_URL"    = data.aws_ssm_parameter.AUTOFARM_API_MRIVER_URL.value,
    "SUNDAESWAP_URL"             = data.aws_ssm_parameter.SUNDAESWAP_URL.value,
    "ETH_URL"                    = data.aws_ssm_parameter.ETH_URL.value,
    "TRADERJOE_SUBGRAPH_URL"     = data.aws_ssm_parameter.TRADERJOE_SUBGRAPH_URL.value,
    "HECO_URL"                   = data.aws_ssm_parameter.HECO_URL.value,
    "CELO_URL"                   = data.aws_ssm_parameter.CELO_URL.value,
    "AURORA_URL"                 = data.aws_ssm_parameter.AURORA_URL.value,
    "AVAX_URL"                   = data.aws_ssm_parameter.AVAX_URL.value,
    "SOL_URL"                    = data.aws_ssm_parameter.SOL_URL.value,
    "XDAI_URL"                   = data.aws_ssm_parameter.XDAI_URL.value,
    "PRICE_SERVICE_URL"          = data.aws_ssm_parameter.PRICE_SERVICE_URL.value,
    "TERRA_URL"                  = data.aws_ssm_parameter.TERRA_URL.value,
    "OPT_URL"                    = data.aws_ssm_parameter.OPT_URL.value,
    "CRONOS_URL"                 = data.aws_ssm_parameter.CRONOS_URL.value,
    "KCC_URL"                    = data.aws_ssm_parameter.KCC_URL.value,
    "HARM_URL"                   = data.aws_ssm_parameter.HARM_URL.value,
    "BOBA_URL"                   = data.aws_ssm_parameter.BOBA_URL.value,
    "OKEX_URL"                   = data.aws_ssm_parameter.OKEX_URL.value,
    "GNOSIS_URL"                 = data.aws_ssm_parameter.GNOSIS_URL.value,
    "MRIVER_URL"                 = data.aws_ssm_parameter.MRIVER_URL.value,
    "POLYGON_URL"                = data.aws_ssm_parameter.POLYGON_URL.value,
    "ARBITRUM_URL"               = data.aws_ssm_parameter.ARBITRUM_URL.value,
    "BSC_URL"                    = data.aws_ssm_parameter.BSC_URL.value,
    "FTM_URL"                    = data.aws_ssm_parameter.FTM_URL.value,
    "DB_HOST"                    = data.aws_ssm_parameter.DB_HOST.value,
    "DB_SYNCHRONIZE"             = data.aws_ssm_parameter.DB_SYNCHRONIZE.value,
    "DB_DATABASE"                = data.aws_ssm_parameter.DB_DATABASE.value,
    "DB_PORT"                    = data.aws_ssm_parameter.DB_PORT.value,
    "DB_LOGGING"                 = data.aws_ssm_parameter.DB_LOGGING.value,
    "DB_CONNECTION"              = data.aws_ssm_parameter.DB_CONNECTION.value,
    "DB_USERNAME"                = data.aws_ssm_parameter.DB_USERNAME.value,
    "DB_PASSWORD"                = data.aws_ssm_parameter.DB_PASSWORD.value,
    "MINSWAP_URL"                = data.aws_ssm_parameter.MINSWAP_URL.value,
    "SOLANA_TOKENS_PUBLIC_API"   = data.aws_ssm_parameter.SOLANA_TOKENS_PUBLIC_API.value,
    "SONAR_FARMS_PUBLIC_API"     = data.aws_ssm_parameter.SONAR_FARMS_PUBLIC_API.value,
    "SONAR_POOLS_PUBLIC_API"     = data.aws_ssm_parameter.SONAR_POOLS_PUBLIC_API.value,
    "WINGRIDERS_AGGREGATOR_URL"  = data.aws_ssm_parameter.WINGRIDERS_AGGREGATOR_URL.value,
    "WINGRIDERS_EXPLORER_URL"    = data.aws_ssm_parameter.WINGRIDERS_EXPLORER_URL.value,
    "CARDANO_BLOCKFROST_API_KEY" = data.aws_ssm_parameter.CARDANO_BLOCKFROST_API_KEY.value,
    "CHAIN_IDS"                  = data.aws_ssm_parameter.CHAIN_IDS.value,
  }
}

terraform {
  backend "s3" {}
}

provider "aws" {
  region = var.env_region
}
