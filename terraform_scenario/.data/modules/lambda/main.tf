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

provider "aws" {
  region = var.aws_region
}

data "aws_caller_identity" "current" {}