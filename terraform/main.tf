# Single-region stack: everything is us-east-1, which is also where CloudFront
# requires its ACM certificate to live — so there is no regional provider alias.
# Credentials come from the environment (AWS_PROFILE / .aws), never hardcoded.
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = "oldams"
      ManagedBy = "terraform"
    }
  }
}

# Account id is resolved at apply time (never committed). Used to scope ARNs.
data "aws_caller_identity" "current" {}
