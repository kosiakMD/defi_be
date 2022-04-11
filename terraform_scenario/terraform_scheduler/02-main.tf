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
    "HTTP_ENDPOINT" = data.aws_ssm_parameter.HTTP_ENDPOINT.value,
    "HTTP_METHOD" = data.aws_ssm_parameter.HTTP_METHOD.value,
    "HTTP_BODY_DATA" = data.aws_ssm_parameter.HTTP_BODY_DATA.value,
  }
}

terraform {
  backend "s3" {}
}

provider "aws" {
  region = var.env_region
}