variable "aws_region" {
  description = "AWS region. Must be us-east-1 — CloudFront's ACM cert lives here."
  type        = string
  default     = "us-east-1"
}

variable "domain" {
  description = "Apex domain. An existing Route 53 public hosted zone with this name is looked up by name (never by id)."
  type        = string
  default     = "oldams.nl"
}

variable "site_bucket_name" {
  description = "S3 bucket holding the static site. Must NOT be the legacy 'oldams' bucket (which predates this project)."
  type        = string
  default     = "oldams-nl-site"
}

variable "github_repo" {
  description = "owner/name of the GitHub repo allowed to deploy via OIDC (main branch only)."
  type        = string
  default     = "oldams-nl/oldams"
}

variable "state_bucket_name" {
  description = "S3 bucket for remote Terraform state. Must match backend.tf."
  type        = string
  default     = "oldams-terraform-state"
}

variable "state_lock_table_name" {
  description = "DynamoDB table for state locking. Must match backend.tf."
  type        = string
  default     = "oldams-terraform-lock"
}
