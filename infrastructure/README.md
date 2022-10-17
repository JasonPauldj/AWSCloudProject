# infrastructure
This repository contains all the infrastructure as code(Cloudformation templates).

## AWS CLI Commands
* Creating a stack 
  ```
  aws cloudformation create-stack --stack-name mystack --template-body file://csye6225-infra.yml --parameters ParameterKey=VPCName,ParameterValue=VPC ParameterKey=VPCCIDRBlock,ParameterValue=10.0.0.0/16 ParameterKey=AMIId,ParameterValue=ami-09175f98dbe79493c
  ```
* Updating a stack
  ```
  aws cloudformation update-stack --stack-name mystack --template-body file://csye6225-infra.yml --parameters ParameterKey=VPCName,ParameterValue=VPC ParameterKey=VPCCIDRBlock,ParameterValue=10.0.0.0/16 ParameterKey=AMIId,ParameterValue=ami-09175f98dbe79493c
  ```

* Creating a new stack with different parameters
  ```
  aws cloudformation create-stack --stack-name mystack1 --template-body file://csye6225-infra.yml --parameters ParameterKey=VPCName,ParameterValue=VPC1 ParameterKey=VPCCIDRBlock,ParameterValue=10.0.0.0/16 ParameterKey=AMIId,ParameterValue=ami-09175f98dbe79493c
  ```
* Deleting a stack
  ```
  aws cloudformation delete-stack --stack-name mystack1
  ```
