# AWS Cloud Project

## Project Overview
- This repository contains the code for a web application and the IaC to deploy the application in AWS
- The REST API application is deployed in AWS EC2 instances with AutoScaling, Load Balancing & Monitoring in place
- Utilized AWS CloudFormation as IaC
- Utilized GitHub Action for CI
- Utilized Packer for building AMI images
- Utilized AWS CodeDeploy for CD

## Folder Contents

| Folder | Notes |
| --- | ----------- |
| infrastructure | This folder contains the AWS CloudFormation templates to build the infrastructure |
| serverless | This folder contains a AWS Lamda Function in Node JS  |
| webservice | This folder contains a REST API Node js application with the CI/CD Github Actions and Packer Template |

## Infrastructure

### AWS CloudFormation
- AWS CloudFormation deploys the following infrastructre
    - VPC
    - Public & Private Subnets
    - Internet Gateway
    - Route Tables
    - Security Groups
    - AWS IAM Roles
    - AWS IAM Policies
    - AWS S3 Buckets
    - RDS Instance
    - Auto Scaling Group
    - Auto Scaling Policies
    - Load Balancer
    - CloudWatch Alarms
    - Dyanamo DBs
    - AWS KMS Keys
- AWS CLI Commands
    - Creating a stack
    ```
    aws cloudformation create-stack --stack-name mystack1 --template-body file://csye6225-infra.yml --parameters ParameterKey=VPCName,ParameterValue=VPC ParameterKey=VPCCIDRBlock,ParameterValue=10.0.0.0/16 ParameterKey=AMIId,ParameterValue=ami-09da6a1180af4c5bc ParameterKey=EnvType,ParameterValue=prod ParameterKey=DNSDomain,ParameterValue=prod.jasonpauldj.me. ParameterKey=CodeDeployS3Bucket,ParameterValue=csye6225-codedeploy-jasonpauldj-prod ParameterKey=LambdaS3Bucket,ParameterValue=csye6225-lambda-jasonpauldj-prod ParameterKey=CertificateArn,ParameterValue=arn:aws:acm:us-east-1:605025718575:certificate/1bdf5744-796f-4953-8b1b-0d1e120310d7 --capabilities CAPABILITY_NAMED_IAM
    ```
    - Updating a stack
    ```
    aws cloudformation update-stack --stack-name mystack1 --template-body file://csye6225-infra.yml --parameters ParameterKey=VPCName,ParameterValue=VPC ParameterKey=VPCCIDRBlock,ParameterValue=10.0.0.0/16 ParameterKey=AMIId,ParameterValue=ami-09da6a1180af4c5bc ParameterKey=EnvType,ParameterValue=prod ParameterKey=DNSDomain,ParameterValue=prod.jasonpauldj.me. ParameterKey=CodeDeployS3Bucket,ParameterValue=csye6225-codedeploy-jasonpauldj-prod ParameterKey=LambdaS3Bucket,ParameterValue=csye6225-lambda-jasonpauldj-prod ParameterKey=CertificateArn,ParameterValue=arn:aws:acm:us-east-1:605025718575:certificate/1bdf5744-796f-4953-8b1b-0d1e120310d7 --capabilities CAPABILITY_NAMED_IAM
    ```
    - Deleting a stack
    ```
    aws cloudformation delete-stack --stack-name mystack1
    ```
    -  Creating policies for ghactions-app
    ```
    aws cloudformation create-stack --stack-name policystack --template-body file://csye6225-policy.yml --parameters ParameterKey=CodeDeployS3Bucket,ParameterValue=csye6225-codedeploy-jasonpauldj-prod --capabilities CAPABILITY_NAMED_IAM
    ```

    - Updating policies for ghactions-app
    ```
    aws cloudformation update-stack --stack-name policystack --template-body file://csye6225-policy.yml --parameters ParameterKey=CodeDeployS3Bucket,ParameterValue=csye6225-codedeploy-jasonpauldj-prod --capabilities CAPABILITY_NAMED_IAM
    ```

    - Deleting policies for ghactions-app
    ```
    aws cloudformation delete-stack --stack-name policystack
    ```

    - Command to import certificate to aws certificate manager
    ```
    aws acm import-certificate --private-key fileb:///Users/jasonpauldarivemula/Downloads/prod-ca/pk.pem --certificate fileb:///Users/jasonpauldarivemula/Downloads/prod-ca/prod_jasonpauldj_me.pem --certificate-chain fileb:///Users/jasonpauldarivemula/Downloads/prod-ca/prod_jasonpauldj_me.ca-bundle.pem
    ```



