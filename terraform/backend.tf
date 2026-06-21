terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.80"
    }
  }

  # Remote state: S3 bucket + DynamoDB lock + KMS key, all defined in state.tf
  # with names isolated to this project. Bootstrap is two-step (see README.md):
  #
  #   1. Leave this `backend "s3"` block COMMENTED. Run with local state:
  #        terraform init
  #        terraform apply -target=aws_s3_bucket.terraform_state \
  #                        -target=aws_s3_bucket_versioning.terraform_state \
  #                        -target=aws_dynamodb_table.terraform_lock \
  #                        -target=aws_kms_alias.terraform_state_key
  #   2. UNCOMMENT the block below, then migrate:
  #        terraform init -migrate-state
  #
  # backend "s3" {
  #   bucket         = "oldams-terraform-state"
  #   key            = "state/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   kms_key_id     = "alias/oldams-terraform-state-key"
  #   dynamodb_table = "oldams-terraform-lock"
  # }
}
