#!/usr/bin/env bash
#export TF_VAR_tf_state_bucket="defiyield-terraform-states"
#export TF_VAR_tf_region="eu-central-1"
#export TF_VAR_environment="dev"
#export TF_VAR_lambda_name="test"

 if   [ "-$TF_VAR_environment" == "-" ] || [ "-$TF_VAR_lambda_name" == "-" ] || [ "-$TF_VAR_tf_state_bucket" == "-" ] || [ "-$TF_VAR_tf_region" == "-" ]; then
   echo "not all environments"
   exit 1
 fi


rm -rf ./.terraform
rm -rf ./.terraform.lock.hcl
terraform init -backend-config "bucket=$TF_VAR_tf_state_bucket" -backend-config "region=$TF_VAR_tf_region" -backend-config "key=lambda/$TF_VAR_lambda_name/terraform.tfstate"
terraform destroy --auto-approve -compact-warnings
rm -rf ./.terraform
rm -rf ./.terraform.lock.hcl


#terraform -chdir=lambda init
#terraform -chdir=lambda apply --auto-approve -compact-warnings
