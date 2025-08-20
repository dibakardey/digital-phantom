provider "aws" {
  region = "ap-south-1" # change if needed
}

# S3 bucket for Lambda packages
resource "aws_s3_bucket" "lambda_bucket" {
  bucket = "ai-c2-less-lab-${random_id.bucket_id.hex}"
}

# Upload coordinator.zip to S3
resource "aws_s3_object" "coordinator_zip" {
    bucket = aws_s3_bucket.lambda_bucket.id
      key    = "coordinator.zip"
        source = "${path.module}/../coordinator.zip"
      }

# Upload agent.zip to S3      
resource "aws_s3_object" "agent_zip" {
    bucket = aws_s3_bucket.lambda_bucket.id
      key    = "agent.zip"
        source = "${path.module}/../agent.zip"
      }

resource "random_id" "bucket_id" {
  byte_length = 4
}

# DynamoDB table to store task logs
resource "aws_dynamodb_table" "task_logs" {
  name         = "ai-c2less-task-logs"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "task_id"

  attribute {
    name = "task_id"
    type = "S"
  }
}

# IAM Role for Lambda
resource "aws_iam_role" "lambda_exec_role" {
  name = "ai-c2less-lambda-exec"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

# Attach AWSLambdaBasicExecutionRole policy
resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

#Dynamo Policy
resource "aws_iam_policy" "lambda_dynamodb_policy" {
  name        = "ai-c2less-lambda-dynamodb"
  description = "Allow Lambda to write tasks to DynamoDB"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action   = [
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:GetItem",
          "dynamodb:Query"
        ]
        Effect   = "Allow"
        Resource = "arn:aws:dynamodb:ap-south-1:020571893394:table/ai-c2less-task-logs"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_dynamodb_attach" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = aws_iam_policy.lambda_dynamodb_policy.arn
}

# Coordinator Lambda
resource "aws_lambda_function" "coordinator" {
    runtime = "python3.9"
    function_name = "ai-c2less-coordinator"
      s3_bucket     = aws_s3_bucket.lambda_bucket.id
        s3_key        = aws_s3_object.coordinator_zip.key
          handler       = "coordinator.lambda_handler"
              role          = aws_iam_role.lambda_exec_role.arn
            }

# Agent Lambda
resource "aws_lambda_function" "agent" {
     runtime = "python3.9"    
     function_name = "ai-c2less-agent"
      s3_bucket     = aws_s3_bucket.lambda_bucket.id
        s3_key        = aws_s3_object.agent_zip.key
          handler       = "agent.lambda_handler"
              role          = aws_iam_role.lambda_exec_role.arn
            }

# API Gateway
resource "aws_apigatewayv2_api" "api" {
  name          = "ai-c2less-api"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "lambda_integration" {
  api_id                 = aws_apigatewayv2_api.api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.coordinator.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

resource "aws_lambda_permission" "api_gateway_invoke" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.coordinator.function_name
  principal     = "apigateway.amazonaws.com"

  # Allow all routes/stages under this API to call Lambda
  source_arn = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}

resource "aws_apigatewayv2_route" "route" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "POST /tasks"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

resource "aws_apigatewayv2_stage" "dev" {
  api_id      = aws_apigatewayv2_api.api.id
  name        = "dev"
  auto_deploy = true

access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gw_logs.arn
    format          = jsonencode({
      requestId       = "$context.requestId",
      routeKey        = "$context.routeKey",
      status          = "$context.status",
      responseLatency = "$context.responseLatency"
    })
  }
}

# CloudWatch log group for API Gateway
resource "aws_cloudwatch_log_group" "api_gw_logs" {
  name              = "/aws/apigateway/ai-c2less-api"
  retention_in_days = 7
}

# IAM policy for API Gateway logging
resource "aws_iam_role_policy" "api_gw_logging" {
  name = "api-gw-log-permission"
  role = aws_iam_role.lambda_exec_role.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect   = "Allow",
        Action   = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        Resource = "*"
      }
    ]
  })
}

output "api_endpoint" {
  value = aws_apigatewayv2_stage.dev.invoke_url
}
