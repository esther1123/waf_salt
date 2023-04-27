import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import { CfnOutput, Stack } from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as cforigins from "aws-cdk-lib/aws-cloudfront-origins";

export class WafSaltRuleService extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const wafRuleIndexBucket = new s3.Bucket(this, 'WAFRuleIndexBucket', {
      bucketName: this.node.tryGetContext("WebACLRuleIndexBucket"),
      accessControl: s3.BucketAccessControl.PRIVATE,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    })

    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OriginAccessIdentity');
    wafRuleIndexBucket.grantRead(originAccessIdentity);
    
    const wafRuleIndexDist = new cloudfront.Distribution(this, 'WAFRuleIndexDistribution', {
      defaultBehavior: {
        origin: new cforigins.S3Origin(wafRuleIndexBucket, { originAccessIdentity }),
      },
    })
    new CfnOutput(scope, "WebACLRuleIndexEndpoint", { value: wafRuleIndexDist.distributionDomainName });
    new CfnOutput(scope, "WebACLRuleIndexDistributionId", { value: wafRuleIndexDist.distributionId });
  }
}
