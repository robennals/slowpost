# Production Deployment Guide (AWS)

This guide describes the exact steps required to deploy Slowpost to Amazon Web Services using Elastic Container Service (ECS) on Fargate. The deployment runs two containers—one for the public Next.js site and one for the Express API—behind an Application Load Balancer (ALB) that routes `/api/*` traffic to the API container.

## Architecture overview

- **Container images**: Pushed to Amazon Elastic Container Registry (ECR) repositories `slowpost-web` and `slowpost-api`.
- **Compute**: AWS Fargate tasks in an ECS service with two containers in the same task definition so that the API and web tiers share the task lifecycle.
- **Networking**: Application Load Balancer with path-based routing rules. `/*` forwards to the web target group (port 3000) and `/api/*` forwards to the API target group (port 3001).
- **Secrets**: Postmark credentials and any other runtime secrets are stored in AWS Secrets Manager or Systems Manager Parameter Store and injected into the task definition as environment variables.

## Prerequisites

1. AWS CLI v2 installed and authenticated (IAM user or role with permissions for ECR and ECS).
2. Docker CLI available locally to build the container images.
3. Node.js 20.x and Yarn Classic (1.x) installed locally or on your CI runner.
4. An AWS account with a VPC, subnets, and security groups suitable for running Fargate tasks behind an ALB.

## 1. One-time AWS infrastructure setup

Perform these actions once per environment (e.g., staging, production).

### 1.1 Create ECR repositories

```bash
aws ecr create-repository --repository-name slowpost-web --image-scanning-configuration scanOnPush=true
aws ecr create-repository --repository-name slowpost-api --image-scanning-configuration scanOnPush=true
```

Take note of your AWS account ID and region; the resulting image URIs follow the pattern `ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/slowpost-web`.

### 1.2 Store secrets

Create secrets for the API credentials (replace the sample values with your own):

```bash
aws secretsmanager create-secret \
  --name slowpost/postmark \
  --secret-string '{"POSTMARK_SERVER_TOKEN":"your-token","POSTMARK_FROM_EMAIL":"no-reply@example.com"}'
```

Alternatively, store individual keys in Systems Manager Parameter Store and mark them as `SecureString` values.

### 1.3 Define the ECS task

Create an ECS task definition with two containers. The snippet below shows the critical sections; adjust VPC and logging configuration as needed. Replace `{{ACCOUNT_ID}}` and `{{REGION}}` with your values.

```json
{
  "family": "slowpost-app",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "networkMode": "awsvpc",
  "executionRoleArn": "arn:aws:iam::{{ACCOUNT_ID}}:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::{{ACCOUNT_ID}}:role/slowpostTaskRole",
  "containerDefinitions": [
    {
      "name": "web",
      "image": "{{ACCOUNT_ID}}.dkr.ecr.{{REGION}}.amazonaws.com/slowpost-web:latest",
      "portMappings": [{ "containerPort": 3000 }],
      "environment": [
        { "name": "NODE_ENV", "value": "production" }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/slowpost",
          "awslogs-region": "{{REGION}}",
          "awslogs-stream-prefix": "web"
        }
      }
    },
    {
      "name": "api",
      "image": "{{ACCOUNT_ID}}.dkr.ecr.{{REGION}}.amazonaws.com/slowpost-api:latest",
      "portMappings": [{ "containerPort": 3001 }],
      "environment": [
        { "name": "NODE_ENV", "value": "production" }
      ],
      "secrets": [
        {
          "name": "POSTMARK_SERVER_TOKEN",
          "valueFrom": "arn:aws:secretsmanager:{{REGION}}:{{ACCOUNT_ID}}:secret:slowpost/postmark:POSTMARK_SERVER_TOKEN::"
        },
        {
          "name": "POSTMARK_FROM_EMAIL",
          "valueFrom": "arn:aws:secretsmanager:{{REGION}}:{{ACCOUNT_ID}}:secret:slowpost/postmark:POSTMARK_FROM_EMAIL::"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/slowpost",
          "awslogs-region": "{{REGION}}",
          "awslogs-stream-prefix": "api"
        }
      }
    }
  ]
}
```

Register the task definition:

```bash
aws ecs register-task-definition --cli-input-json file://task-definition.json
```

### 1.4 Create the ECS service and load balancer

1. Create an Application Load Balancer with two target groups: one for port 3000 (`web`) and another for port 3001 (`api`).
2. Configure listener rules so that `/api/*` traffic forwards to the API target group and all other paths forward to the web target group.
3. Create an ECS service (e.g., `slowpost-app`) in your cluster that uses the `slowpost-app` task definition, attaches both target groups, and runs at least two tasks for redundancy.

Once this setup is complete, the service will pull whatever image tags you publish to ECR (defaulting to `latest`).

## 2. Prepare environment variables for `yarn deploy`

Export the variables below in your shell or CI job before running the deployment script:

| Variable | Required | Description |
| --- | --- | --- |
| `AWS_REGION` | Yes | Region that hosts your ECR repositories and ECS cluster. |
| `AWS_ACCOUNT_ID` | Yes | 12-digit AWS account ID used in the ECR registry domain. |
| `SLOWPOST_WEB_ECR_REPOSITORY` | Yes | Name of the ECR repository for the web container (e.g., `slowpost-web`). |
| `SLOWPOST_API_ECR_REPOSITORY` | Yes | Name of the ECR repository for the API container (e.g., `slowpost-api`). |
| `SLOWPOST_ECS_CLUSTER` | Yes | Name of the ECS cluster that hosts the Slowpost service. |
| `SLOWPOST_ECS_SERVICE` | Yes | Name of the ECS service to update (e.g., `slowpost-app`). |
| `AWS_PROFILE` | No | If you use a named AWS CLI profile, set it here so the deploy script reuses it. |
| `IMAGE_TAG` | No | Custom image tag. Defaults to the short Git commit hash when omitted. |

Example shell setup:

```bash
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID=123456789012
export SLOWPOST_WEB_ECR_REPOSITORY=slowpost-web
export SLOWPOST_API_ECR_REPOSITORY=slowpost-api
export SLOWPOST_ECS_CLUSTER=slowpost-production
export SLOWPOST_ECS_SERVICE=slowpost-app
export AWS_PROFILE=slowpost-prod
export IMAGE_TAG=$(git rev-parse --short HEAD)
```

Ensure that your AWS credentials grant permissions for `ecr:*` and `ecs:*` actions used by the script.

## 3. Deploy with Yarn

Run the deployment script from the repository root:

```bash
yarn deploy
```

The script performs the following actions:

1. Verifies Docker and the AWS CLI are available and that all required environment variables are set.
2. Installs dependencies and builds both the API and web workspaces.
3. Builds Docker images using `packages/server/Dockerfile` and `packages/client/Dockerfile`.
4. Tags each image with both `:latest` and the resolved `IMAGE_TAG` value, authenticates to ECR, and pushes the tags.
5. Forces a new deployment on the specified ECS service so that it pulls the freshly pushed images.

If any required environment variable is missing, the script exits immediately with a warning so you can correct the configuration before images are built or pushed.

## 4. Verify the release

After `yarn deploy` completes, wait for ECS to replace the tasks. You can monitor progress with:

```bash
aws ecs describe-services \
  --cluster "$SLOWPOST_ECS_CLUSTER" \
  --services "$SLOWPOST_ECS_SERVICE" \
  ${AWS_PROFILE:+--profile $AWS_PROFILE} \
  --region "$AWS_REGION" \
  --query 'services[0].deployments'
```

When only one primary deployment remains and all tasks are `RUNNING`, perform the following checks:

1. Visit the ALB URL or your custom domain to confirm the Next.js site loads.
2. Issue a request to `/api/home/ada` (replace `ada` with a seeded username) to confirm the API responds with HTTP 200.
3. Trigger a login to confirm Postmark emails are delivered. Watch CloudWatch Logs for the `api` stream for any Postmark errors.

Following these steps yields a repeatable production deployment on AWS managed entirely through the `yarn deploy` command and the supporting infrastructure configured above.
