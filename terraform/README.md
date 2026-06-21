# terraform — oldams infrastructure

A near-zero-cost static site for **oldams.nl**:

```
Route53 (oldams.nl + www) ──> CloudFront (HTTPS, OAC) ──> private S3 bucket
                                   ▲
                          ACM cert (us-east-1)
```

Plus a least-privilege `oldams-deploy` IAM role that GitHub Actions assumes (via
OIDC) to sync the site and invalidate the CDN. Everything is us-east-1.

No infrastructure identifiers are committed here: the Route 53 zone is looked up
**by name** (`var.domain`), the account id comes from `aws_caller_identity`, and
the GitHub OIDC provider is referenced as a data source. Account-specific values
appear only at apply time via `terraform output`.

## Prerequisites

- AWS credentials in the environment (the `terraform` profile under `.aws/`).
- An existing **public Route 53 hosted zone** for `oldams.nl` (already present).
- An existing **GitHub OIDC provider** for `token.actions.githubusercontent.com`
  in the account (already present — referenced, not created). If it did not
  exist, you would add an `aws_iam_openid_connect_provider` resource first.

```bash
export AWS_SHARED_CREDENTIALS_FILE="$PWD/../.aws/credentials"
export AWS_CONFIG_FILE="$PWD/../.aws/config"
export AWS_PROFILE=terraform
```

## Bootstrap (one time)

Remote state lives in resources this stack also manages, so create them first
with local state, then migrate:

```bash
# 1. backend "s3" stays COMMENTED in backend.tf for this step.
terraform init
terraform apply \
  -target=aws_s3_bucket.terraform_state \
  -target=aws_s3_bucket_versioning.terraform_state \
  -target=aws_s3_bucket_server_side_encryption_configuration.terraform_state \
  -target=aws_s3_bucket_public_access_block.terraform_state \
  -target=aws_dynamodb_table.terraform_lock \
  -target=aws_kms_alias.terraform_state_key

# 2. Uncomment the backend "s3" block in backend.tf, then:
terraform init -migrate-state
```

## Deploy the infrastructure

```bash
terraform plan
terraform apply
```

⚠️ **DNS cutover.** `oldams.nl` currently resolves to the legacy site via plain
A/AAAA records. The `aws_route53_record.apex_*` / `www_*` resources replace those
with aliases to the new CloudFront distribution. Only apply when you're ready to
point the live domain at the new site. (CloudFront also needs ~15 min to deploy,
and the ACM cert must validate via the DNS records this stack creates.)

> The legacy `oldams` S3 bucket and any legacy origin are **not** managed here
> and are left untouched. The site bucket is `var.site_bucket_name`
> (`oldams-nl-site`), a different bucket.

## Wire up CI

After `apply`, set these in the GitHub repo so the deploy workflow can run:

```bash
terraform output -raw deploy_role_arn            # -> repo secret AWS_DEPLOY_ROLE_ARN
terraform output -raw site_bucket                # -> workflow env (or secret)
terraform output -raw cloudfront_distribution_id # -> workflow env (or secret)
```

See `.github/workflows/deploy.yml`.
