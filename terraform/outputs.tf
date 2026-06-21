# These are computed at apply time (not committed). Read them with
# `terraform output` to wire up CI — see terraform/README.md.

output "site_url" {
  description = "Public site URL."
  value       = "https://${var.domain}"
}

output "site_bucket" {
  description = "S3 bucket the static export is synced to (CI: aws s3 sync)."
  value       = aws_s3_bucket.site.bucket
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution id (CI: cache invalidation)."
  value       = aws_cloudfront_distribution.site.id
}

output "deploy_role_arn" {
  description = "ARN CI assumes via GitHub OIDC. Set as the AWS_DEPLOY_ROLE_ARN repo secret."
  value       = aws_iam_role.deploy.arn
}

output "state_bucket" {
  description = "S3 bucket holding Terraform state."
  value       = aws_s3_bucket.terraform_state.id
}
