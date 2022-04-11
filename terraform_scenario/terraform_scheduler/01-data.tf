data "aws_ssm_parameter" "HTTP_BODY_DATA" {
  name = upper("/${var.environment}/HTTP_BODY_DATA")
}

data "aws_ssm_parameter" "HTTP_ENDPOINT" {
  name = upper("/${var.environment}/HTTP_ENDPOINT")
}

data "aws_ssm_parameter" "HTTP_METHOD" {
  name = upper("/${var.environment}/HTTP_METHOD")
}
