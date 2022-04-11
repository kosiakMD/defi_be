data "aws_ssm_parameter" "DB_HOST" {
  name = upper("/${var.environment}/DB_HOST")
}

data "aws_ssm_parameter" "DB_PORT" {
  name = upper("/${var.environment}/DB_PORT")
}

data "aws_ssm_parameter" "DB_DATABASE" {
  name = upper("/${var.environment}/DB_DATABASE")
}

data "aws_ssm_parameter" "DB_USERNAME" {
  name = upper("/${var.environment}/DB_USERNAME")
}

data "aws_ssm_parameter" "DB_PASSWORD" {
  name = upper("/${var.environment}/DB_PASSWORD")
}

