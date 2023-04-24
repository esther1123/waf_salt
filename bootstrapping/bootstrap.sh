#!/bin/bash

SHELL_PATH=$(cd "$(dirname "$0")";pwd)

AWS_ACCOUNT="$(aws sts get-caller-identity --output text --query 'Account')"

DEPLOYMENT_REGION="ap-northeast-1"
if [ -z "$DEPLOYMENT_REGION" ]; then
    DEPLOYMENT_REGION="$(aws configure get region)"
fi

WAF_WEB_ACL_NAME="waf-salt-acl"
WAF_WEB_ACL_SCOPE="REGIONAL"
WAF_WEB_ACL_REGION=$DEPLOYMENT_REGION
WAF_WEB_ACL_ID=""

S3_BUCKET_SUFFIX="${AWS_ACCOUNT: -4}"
WAF_WEB_ACL_RULE_INDEX_BUCKET="waf-salt-rule-index-$DEPLOYMENT_REGION-$S3_BUCKET_SUFFIX"
WAF_WEB_ACL_RULE_INDEX_OBJECT_KEY="waf-salt-rule-key.txt"

CDK_DEPLOYMENT_OUTPUT_FILE="${SHELL_PATH}/waf-salt-app/cdk.out/deployment-output.json"
pushd ./waf-salt-app &> /dev/null

  npx cdk bootstrap aws://${AWS_ACCOUNT}/${DEPLOYMENT_REGION} -c WebACLName=$WAF_WEB_ACL_NAME -c WebACLScope=$WAF_WEB_ACL_SCOPE -c WebACLRuleIndexBucket=$WAF_WEB_ACL_RULE_INDEX_BUCKET

  export CDK_DEPLOY_ACCOUNT=${AWS_ACCOUNT}
  export CDK_DEPLOY_REGION=${DEPLOYMENT_REGION}

  npx cdk deploy -c WebACLName=$WAF_WEB_ACL_NAME -c WebACLScope=$WAF_WEB_ACL_SCOPE -c WebACLRuleIndexBucket=$WAF_WEB_ACL_RULE_INDEX_BUCKET --outputs-file $CDK_DEPLOYMENT_OUTPUT_FILE
  
popd &> /dev/null

WAF_WEB_ACL_ID=$(aws wafv2 list-web-acls --scope $WAF_WEB_ACL_SCOPE --region $WAF_WEB_ACL_REGION --output text --query "WebACLs[?Name=='$WAF_WEB_ACL_NAME'].Id")
if [ ! -z "$WAF_WEB_ACL_ID" ]; then
  WAF_WEB_ACL_RULE_INDEX_DISTRIBUTION_ID=$(jq '.WafSaltAppStack.WebACLRuleIndexDistributionId' $CDK_DEPLOYMENT_OUTPUT_FILE | tr -d '"')
  WAF_CONFIG_TEMPLATE_FILE="$SHELL_PATH/waf-config.json.template"
  WAF_CONFIG_FILE="$SHELL_PATH/../waf-config.json"
  sed "s/PA_WEB_ACL_NAME/$WAF_WEB_ACL_NAME/g;s/PA_WEB_ACL_ID/$WAF_WEB_ACL_ID/g;s/PA_WEB_ACL_SCOPE/$WAF_WEB_ACL_SCOPE/g;s/PA_WEB_ACL_REGION/$WAF_WEB_ACL_REGION/g;s/PA_WEB_ACL_RULE_INDEX_DISTRIBUTION_ID/$WAF_WEB_ACL_RULE_INDEX_DISTRIBUTION_ID/g;s/PA_WEB_ACL_RULE_INDEX_BUCKET/$WAF_WEB_ACL_RULE_INDEX_BUCKET/g;s/PA_WEB_ACL_RULE_INDEX_OBJECT_KEY/$WAF_WEB_ACL_RULE_INDEX_OBJECT_KEY/g" ${WAF_CONFIG_TEMPLATE_FILE} > $WAF_CONFIG_FILE
fi
