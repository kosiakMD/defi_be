## Create and schedule Lambda function vaults (AKA pools)

### Set environments for build and deploy

```shell
export TF_VAR_tf_state_bucket="defiyield-terraform-states"
export TF_VAR_tf_region="eu-central-1"
export TF_VAR_environment="dev"
export TF_VAR_lambda_name="vaults"
export TF_DIR="terraform_pools"
```
NB!:
- TF_VAR_environment and TF_VAR_lambda_name must be lowercase.
- Fullname lambda function will be ```${TF_VAR_environment}_${TF_VAR_lambda_name}``` (i.e dev_vaults) 

### Docker image pools
```shell
docker build -f terraform_pools/Dockerfile_pools -t 625623467395.dkr.ecr.eu-central-1.amazonaws.com/${TF_VAR_environment}_${TF_VAR_lambda_name}:latest .
aws ecr create-repository --repository-name ${TF_VAR_environment}_${TF_VAR_lambda_name} || true
aws ecr get-login-password --region eu-central-1 | docker login --username AWS --password-stdin 625623467395.dkr.ecr.eu-central-1.amazonaws.com
docker push 625623467395.dkr.ecr.eu-central-1.amazonaws.com/${TF_VAR_environment}_${TF_VAR_lambda_name}:latest
```

### Terraform create AWS Lamdba function
Check and edit if need `terraform_pools/02-main.tf`
```shell
rm -rf ./$TF_DIR/.terraform
rm -rf ./$TF_DIR/.terraform.lock.hcl
terraform  -chdir=$TF_DIR init -backend-config "bucket=$TF_VAR_tf_state_bucket" -backend-config "region=$TF_VAR_tf_region" -backend-config "key=lambda/$TF_VAR_lambda_name/terraform.tfstate"
terraform -chdir=$TF_DIR apply --auto-approve -compact-warnings
rm -rf ./$TF_DIR/.terraform
rm -rf ./$TF_DIR/.terraform.lock.hcl
```
Can use `bash createlambda.sh`

### Terraform delete AWS Lamdba function
```shell
rm -rf ./$TF_DIR/.terraform
rm -rf ./$TF_DIR/.terraform.lock.hcl
terraform  -chdir=$TF_DIR init -backend-config "bucket=$TF_VAR_tf_state_bucket" -backend-config "region=$TF_VAR_tf_region" -backend-config "key=lambda/$TF_VAR_lambda_name/terraform.tfstate"
terraform -chdir=$TF_DIR destroy --auto-approve -compact-warnings
rm -rf ./$TF_DIR/.terraform
rm -rf ./$TF_DIR/.terraform.lock.hcl
```
Can use `bash deletelambda.sh`
### Additional script for parsing .env
```shell
bash parameters_from_env.sh
```

### ToDo
Create universal Dockerfile and install script
```shell
docker build -f terraform_pools/Dockerfile_template --build-arg function_name=lambda_vault -t ecr:tag .
```