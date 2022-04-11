module "lambda" {
  source                     = "../.data/modules/lambda"
  aws_region                 = var.env_region
  ecr_repository_name        = "${var.environment}_${var.lambda_name}"
  docker_image_tag           = var.image_tag
  lambda_name                = "${var.environment}_${var.lambda_name}"
  lambda_options_memory_size = "256"
  lambda_options_timeout     = "60"
  schedule                   = var.schedule_minutes
  environment_variables = {
    "DB_HOST" = data.aws_ssm_parameter.DB_HOST.value,
    "DB_PORT" = data.aws_ssm_parameter.DB_PORT.value,
    "DB_DATABASE" = data.aws_ssm_parameter.DB_DATABASE.value,
    "DB_USERNAME" = data.aws_ssm_parameter.DB_USERNAME.value,
    "DB_PASSWORD" = data.aws_ssm_parameter.DB_PASSWORD.value,
  }
}

terraform {
  backend "s3" {}
}

provider "aws" {
  region = var.env_region
}