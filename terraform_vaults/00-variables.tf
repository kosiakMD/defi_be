variable "tf_region" {}
variable "environment" {}
variable "tf_state_bucket" {}
variable "lambda_name" {}
variable "image_tag" {
  type = string
  default = "latest"
}
