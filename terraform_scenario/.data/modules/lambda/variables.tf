variable "aws_region" {
  #  default     = "us-west-2"
  description = "AWS Region to deploy"
  type        = string
}

#variable "iam_role_lambda" {
#  //  type        = string
#}

variable "ecr_repository_name" {
  description = "ECR repository used in Lambda function"
  type        = string
}

variable "docker_image_tag" {
  type = string
}


variable "lambda_name" {
  description = "Name of the Lambda Function"
  type        = string
}
variable "lambda_options_memory_size" {}
variable "lambda_options_timeout" {}
variable "environment_variables" {
  type = map(string)
}

variable "schedule" {
  description = "Amazon EventBridge Rules schedule - minutes"
  type = string
}