terraform {
  required_version = ">= 0.12"
  required_providers {
    aws = {
      source = "hashicorp/aws"
      #      version = ">= 3.31.0"
    }

    random = {
      source = "hashicorp/random"
      #      version = "3.0.0"
    }
    null = ">= 2.0"
    tls  = ">= 3.1"

    local = {
      source = "hashicorp/local"
      #      version = "2.0.0"
    }
  }
}

#provider "aws" {
#  region = var.aws_region
#}

data "aws_caller_identity" "current" {}
#data "aws_vpc" "lambda_vpc" {
#  #  default = var.env == "staging" ? false : true
#  filter {
#    name = "tag:Name"
#    values = var.env == "staging" ? ["staging"] : ["default"]
#  }
#}
data "aws_vpc" "lambda_vpc" {
  #  default = var.env == "staging" ? false : true
  filter {
    name = "tag:Name"
    values = var.aws_region == "us-west-2" ? ["staging"] : ["lambda-vpc"]
  }
}
#env_region

data "aws_subnet" "lambda_vpn_subnet_id" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.lambda_vpc.id]
  }
  #  filter {
  #    name   = "tag:Name"
  #    values = ["subnet-public3-us-west-2c"]
  #  }
  availability_zone_id = "*-az1"
}

data "aws_security_group" "lambda_sg" {
#    filter {
#      name   = "tag:Name"
#      values = ["4lambda"]
#    }
  vpc_id = data.aws_vpc.lambda_vpc.id
  name = "4lambda"
}
