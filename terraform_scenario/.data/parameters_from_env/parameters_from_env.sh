#!/usr/bin/env bash
#environment="STAGING"
environment="DEV"
#env_region="us-west-2"
env_region="eu-central-1"
IFS="="
while read -r name value
do
  names=$(echo "$name"   | tr -d '"' | tr -d "'" | tr -d " " )
  values=$(echo "$value" | tr -d '"' | tr -d "'" | tr -d " " )
  if ! [[ $name = \#* ]] && ! [[ "-$names" == "-" ]] ;
   then
  echo "Content of $name is $values"
  aws ssm delete-parameter --region $env_region --name "/$environment/$names"
  aws ssm put-parameter --region $env_region --name "/$environment/$names" --type "SecureString"  --value "$values"
  echo "data \"aws_ssm_parameter\" \"$environment_$names\" {" >> 01-datas.tf
  echo "  name = upper(\"/\${var.environment}/$names\"" >> 01-datas.tf
  echo "}" >> 01-datas.tf
  echo >> 01-datas.tf
  echo "    \"$names\" = data.aws_ssm_parameter.$environment_$names.value," >> listformain.txt
 fi

done < .parameters
