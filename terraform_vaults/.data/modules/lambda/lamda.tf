module "lambda_function_container_image" {
  source         = "terraform-aws-modules/lambda/aws"
#  function_name  = "${var.environment}-${var.lambda_name}"
  function_name  = var.lambda_name
  create_package = false
  image_uri      = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${var.ecr_repository_name}:${var.docker_image_tag}"
  package_type   = "Image"
  memory_size    = var.lambda_options_memory_size
  #  memory_size                       = "512"
  timeout = var.lambda_options_timeout
  #  timeout                           = "90"
  cloudwatch_logs_retention_in_days = "30"
  environment_variables = var.environment_variables
#  environment_variables = {
#    Serverless = "Terraform"
#  }
}

data "aws_iam_policy" "service_policy" {
  arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
#resource "aws_iam_role_policy_attachment" "lambda_policy" {
#  role       = var.iam_role_lambda.name
#  policy_arn = data.aws_iam_policy.service_policy.arn
#}

# Amazon EventBridge Rules
resource "aws_cloudwatch_event_rule" "lambda" {
  name                = "${var.lambda_name}-rule"
  description         = "Run Lambda function ${module.lambda_function_container_image.lambda_function_name} every ${var.schedule} minutes"
  schedule_expression = "rate(${var.schedule} minutes)"
}

resource "aws_cloudwatch_event_target" "lambda" {
  rule      = aws_cloudwatch_event_rule.lambda.name
  target_id = "lambda"
  arn       = module.lambda_function_container_image.lambda_function_arn
}

resource "aws_lambda_permission" "allow_cloudwatch" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = module.lambda_function_container_image.lambda_function_name
  principal = "events.amazonaws.com"
#  rule      = aws_cloudwatch_event_rule.lambda.arn
  source_arn    = aws_cloudwatch_event_rule.lambda.arn
}
