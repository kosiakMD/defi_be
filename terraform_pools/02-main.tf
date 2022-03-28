module "lambda" {
  source                     = "./.data/modules/lambda"
  aws_region                 = "eu-central-1"
  ecr_repository_name        = "${var.environment}_${var.lambda_name}"
  docker_image_tag           = "latest"
  lambda_name                = "${var.environment}_${var.lambda_name}"
  lambda_options_memory_size = "750"
  lambda_options_timeout     = "300"
  schedule                   = "5"
  environment_variables = {
    "INTEGRATION_SERVICE_URL" = data.aws_ssm_parameter.DEV_INTEGRATION_SERVICE_URL.value,
    "ACCOUNT_SERVICE_URL"     = data.aws_ssm_parameter.DEV_ACCOUNT_SERVICE_URL.value,
    "AUTOFARM_API_CELO_URL"   = data.aws_ssm_parameter.DEV_AUTOFARM_API_CELO_URL.value,
    "AUTOFARM_API_HECO_URL"   = data.aws_ssm_parameter.DEV_AUTOFARM_API_HECO_URL.value,
    "AUTOFARM_API_CRO_URL"    = data.aws_ssm_parameter.DEV_AUTOFARM_API_CRO_URL.value,
    "AUTOFARM_API_FTM_URL"    = data.aws_ssm_parameter.DEV_AUTOFARM_API_FTM_URL.value,
    "AUTOFARM_API_AVAX_URL"   = data.aws_ssm_parameter.DEV_AUTOFARM_API_AVAX_URL.value,
    "AUTOFARM_API_XDAI_URL"   = data.aws_ssm_parameter.DEV_AUTOFARM_API_XDAI_URL.value,
    "AUTOFARM_API_HARM_URL"   = data.aws_ssm_parameter.DEV_AUTOFARM_API_HARM_URL.value,
    "AUTOFARM_API_URL"        = data.aws_ssm_parameter.DEV_AUTOFARM_API_URL.value,
    "AUTOFARM_API_OKEX_URL"   = data.aws_ssm_parameter.DEV_AUTOFARM_API_OKEX_URL.value,
    "AUTOFARM_API_MRIVER_URL" = data.aws_ssm_parameter.DEV_AUTOFARM_API_MRIVER_URL.value,
    "SUNDAESWAP_URL"          = data.aws_ssm_parameter.DEV_SUNDAESWAP_URL.value,
    "ETH_URL"                 = data.aws_ssm_parameter.DEV_ETH_URL.value,
    "TRADERJOE_SUBGRAPH_URL"  = data.aws_ssm_parameter.DEV_TRADERJOE_SUBGRAPH_URL.value,
    "HECO_URL"                = data.aws_ssm_parameter.DEV_HECO_URL.value,
    "CELO_URL"                = data.aws_ssm_parameter.DEV_CELO_URL.value,
    "AURORA_URL"              = data.aws_ssm_parameter.DEV_AURORA_URL.value,
    "AVAX_URL"                = data.aws_ssm_parameter.DEV_AVAX_URL.value,
    "SOL_URL"                 = data.aws_ssm_parameter.DEV_SOL_URL.value,
    "XDAI_URL"                = data.aws_ssm_parameter.DEV_XDAI_URL.value,
    "PRICE_SERVICE_URL"       = data.aws_ssm_parameter.DEV_PRICE_SERVICE_URL.value,
    "TERRA_URL"               = data.aws_ssm_parameter.DEV_TERRA_URL.value,
    "OPT_URL"                 = data.aws_ssm_parameter.DEV_OPT_URL.value,
    "CRONOS_URL"              = data.aws_ssm_parameter.DEV_CRONOS_URL.value,
    "KCC_URL"                 = data.aws_ssm_parameter.DEV_KCC_URL.value,
    "HARM_URL"                = data.aws_ssm_parameter.DEV_HARM_URL.value,
    "BOBA_URL"                = data.aws_ssm_parameter.DEV_BOBA_URL.value,
    "OKEX_URL"                = data.aws_ssm_parameter.DEV_OKEX_URL.value,
    "GNOSIS_URL"              = data.aws_ssm_parameter.DEV_GNOSIS_URL.value,
    "MRIVER_URL"              = data.aws_ssm_parameter.DEV_MRIVER_URL.value,
    "POLYGON_URL"             = data.aws_ssm_parameter.DEV_POLYGON_URL.value,
    "ARBITRUM_URL"            = data.aws_ssm_parameter.DEV_ARBITRUM_URL.value,
    "BSC_URL"                 = data.aws_ssm_parameter.DEV_BSC_URL.value,
    "FTM_URL"                 = data.aws_ssm_parameter.DEV_FTM_URL.value,
    "DB_HOST"                 = data.aws_ssm_parameter.DEV_DB_HOST.value,
    "DB_SYNCHRONIZE"          = data.aws_ssm_parameter.DEV_DB_SYNCHRONIZE.value,
    "DB_DATABASE"             = data.aws_ssm_parameter.DEV_DB_DATABASE.value,
    "DB_PORT"                 = data.aws_ssm_parameter.DEV_DB_PORT.value,
    "DB_LOGGING"              = data.aws_ssm_parameter.DEV_DB_LOGGING.value,
    "DB_CONNECTION"           = data.aws_ssm_parameter.DEV_DB_CONNECTION.value,
    "DB_USERNAME"             = data.aws_ssm_parameter.DEV_DB_USERNAME.value,
  }
}

terraform {
  backend "s3" {}
}

provider "aws" {
  region = var.tf_region
}