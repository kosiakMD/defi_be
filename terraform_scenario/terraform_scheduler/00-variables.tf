variable "tf_region" {}
variable "environment" {}
variable "env_region" {}
variable "schedule_minutes" {}
variable "tf_state_bucket" {}
variable "lambda_name" {}
variable "image_tag" {
  type = string
  default = "latest"
}
variable "vpc" {
  type = string
  default = "No"
}