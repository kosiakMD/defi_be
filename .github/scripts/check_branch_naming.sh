#!/bin/bash

local_branch_name="$(git rev-parse --abbrev-ref HEAD)"

echo $local_branch_name

user_name="$(git config user.name)"

echo $user_name

valid_branch_regex="^((([a-zA-Z\&\_\-]+)\/(feature|bugfix|hotfix|config|common|(ID\-[0-9]{1,4}))\/[a-zA-Z0-9\&\_\-]+))|stage|develop$"

message="There is something wrong with your branch name. Branch names in this project must adhere to this contract: $valid_branch_regex. Your commit will be rejected. You should rename your branch to a valid name and try again."

if [[ ! $local_branch_name =~ $valid_branch_regex ]]; then
    echo "$message"
    exit 1
fi

exit 0
