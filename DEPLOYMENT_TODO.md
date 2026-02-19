# Deployment checklist — CareNearby

This file lists actionable items and resources needed to deploy the CareNearby backend and mobile app to production.

## Backend (Docker + AWS)

- Review and harden `Dockerfile` (multi-stage, minimal runtime image)
- Create local `docker-compose` staging config for testing
- Create MongoDB production cluster (MongoDB Atlas) and obtain `MONGODB_URI`
- Create AWS ECR repository for backend Docker images
- Create IAM user/role for CI with ECR/ECS permissions (push/pull, update services)
- Add GitHub Actions workflow to build, test, and push image to ECR
- Create AWS ECS Fargate cluster and task definition
- Create ALB (Application Load Balancer) + target group and HTTPS listener
- Request ACM certificate for your domain (region dependent)
- Create Route53 DNS record(s) for app domain pointing to ALB
- Store secrets in AWS Secrets Manager (DB URI, JWT_SECRET, STRIPE_KEY)
- Create Security Groups and VPC settings (restrict ports to ALB and admin IPs)
- Configure CloudWatch Log Group and ECS task logging to CloudWatch
- Add ECS service autoscaling rules and CloudWatch alarms (CPU, memory, 5xx)
- Configure CI/CD deploy step to update ECS service after image push
- Configure Stripe webhooks and secure endpoint (verify signatures)
- Enable backups for DB (Atlas snapshots) and define retention policy
- Create a staging environment (separate cluster, DB, DNS)

## Mobile (Expo)

- Create Expo account and enable EAS (Expo Application Services)
- Add `eas.json` and configure build profiles (`production`, `staging`)
- Add production env vars and API URL to EAS secrets
- Configure Android (Google Play) and iOS (Apple) store credentials
- Run `eas build` and `eas submit` to publish

## CI / Security / Observability

- GitHub Actions: build/test/push to ECR, and deploy to ECS
- Use IAM least-privilege for CI credentials (rotate keys, use OIDC where possible)
- Store application secrets in Secrets Manager (not in repo)
- Enable HTTPS with ACM-managed certs and enforce HSTS
- Add monitoring and error tracking (Sentry, Datadog, or CloudWatch + alarms)
- Add health-check and readiness endpoints on the API
- Create smoke tests and automated integration tests for deploy pipelines

## Runbook & Operations

- Document rollback procedure (revert to previous image in ECR)
- Document DB restore steps and snapshot retention policy
- Add incident contact information and escalation steps

---

If you want, I can: harden the `Dockerfile`, add a GitHub Actions workflow, or scaffold `eas.json` next. Tell me which to start.
