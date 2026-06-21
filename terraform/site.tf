# =============================================================================
# Static site: oldams.nl (apex) + www -> apex
#
#   Route53  oldams.nl      A/AAAA-alias ┐
#            www.oldams.nl  A/AAAA-alias ┴─> CloudFront (HTTPS, PriceClass_100)
#                                            │ viewer-request CF Function: 301 www -> apex
#                                            └─> S3 (private, OAC) static files
#
# Cost ≈ $0-1/mo: no server, no load balancer, no database. Content (the Next.js
# `out/` export) is uploaded and the CDN invalidated by CI; Terraform owns infra.
# =============================================================================

locals {
  apex = var.domain          # oldams.nl
  www  = "www.${var.domain}" # www.oldams.nl
}

# --- Static origin: a private S3 bucket (only CloudFront may read it) --------
resource "aws_s3_bucket" "site" {
  bucket = var.site_bucket_name
}

resource "aws_s3_bucket_ownership_controls" "site" {
  bucket = aws_s3_bucket.site.id
  rule {
    object_ownership = "BucketOwnerEnforced" # ACLs off
  }
}

resource "aws_s3_bucket_public_access_block" "site" {
  bucket                  = aws_s3_bucket.site.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Origin Access Control: CloudFront signs origin requests; the bucket stays private.
resource "aws_cloudfront_origin_access_control" "site" {
  name                              = "oldams-site"
  description                       = "OAC for the oldams static site bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# --- TLS certificate (CloudFront requires us-east-1 = the default provider) --
data "aws_route53_zone" "root" {
  name         = var.domain # looked up by name, never by id
  private_zone = false
}

resource "aws_acm_certificate" "site" {
  domain_name               = local.apex
  subject_alternative_names = [local.www]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.site.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  }

  zone_id         = data.aws_route53_zone.root.zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.record]
  ttl             = 60
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "site" {
  certificate_arn         = aws_acm_certificate.site.arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]
}

# --- www -> apex 301 (cheap CloudFront Function, runs at the edge) -----------
resource "aws_cloudfront_function" "www_redirect" {
  name    = "oldams-www-redirect"
  runtime = "cloudfront-js-2.0"
  comment = "301 www.oldams.nl -> apex oldams.nl"
  publish = true
  code    = file("${path.module}/site_www_redirect.js")
}

# AWS-managed cache policy (cache by URL, gzip/br) — no custom policy needed.
data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

# --- CDN --------------------------------------------------------------------
resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "oldams static site"
  default_root_object = "index.html"
  price_class         = "PriceClass_100" # North America + Europe = cheapest
  aliases             = [local.apex, local.www]

  origin {
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_id                = "s3-site"
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  default_cache_behavior {
    target_origin_id       = "s3-site"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = data.aws_cloudfront_cache_policy.caching_optimized.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.www_redirect.arn
    }
  }

  # Private bucket returns 403 for missing keys; serve the static 404 page.
  custom_error_response {
    error_code            = 403
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 10
  }
  custom_error_response {
    error_code            = 404
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 10
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.site.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

# Bucket policy: allow ONLY this distribution (via OAC) to read objects. Scoped
# to AWS:SourceArn, so it is not "public" and coexists with the access block.
resource "aws_s3_bucket_policy" "site" {
  bucket = aws_s3_bucket.site.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontServicePrincipalReadOnly"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.site.arn}/*"
      Condition = {
        StringEquals = { "AWS:SourceArn" = aws_cloudfront_distribution.site.arn }
      }
    }]
  })

  depends_on = [aws_s3_bucket_public_access_block.site]
}

# --- DNS: apex + www -> CloudFront ------------------------------------------
# NOTE: oldams.nl currently has plain A/AAAA records pointing at the legacy site.
# Applying these aliases is the DNS cutover to the new CloudFront distribution.
resource "aws_route53_record" "apex_a" {
  zone_id = data.aws_route53_zone.root.zone_id
  name    = local.apex
  type    = "A"
  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "apex_aaaa" {
  zone_id = data.aws_route53_zone.root.zone_id
  name    = local.apex
  type    = "AAAA"
  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www_a" {
  zone_id = data.aws_route53_zone.root.zone_id
  name    = local.www
  type    = "A"
  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www_aaaa" {
  zone_id = data.aws_route53_zone.root.zone_id
  name    = local.www
  type    = "AAAA"
  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}
