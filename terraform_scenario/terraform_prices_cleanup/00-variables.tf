variable "tf_region" {}
variable "tf_state_bucket" {}
variable "env_region" {}
variable "schedule_minutes" {}
variable "environment" {}
variable "lambda_name" {}
variable "image_tag" {
  type = string
  default = "latest"
}
