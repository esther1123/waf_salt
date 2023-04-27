import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as wafsalttest from '../lib/waf-salt-test-service';
import * as wafsaltrule from '../lib/waf-salt-rule-service';

export class WafSaltAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new wafsalttest.WafSaltTestService(this, 'WafSaltTestService');
    new wafsaltrule.WafSaltRuleService(this, 'WafSaltRuleService');
  }
}
