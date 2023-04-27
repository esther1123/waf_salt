import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';

export class WafSaltTestService extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const widgetBucket = new s3.Bucket(this, "WidgetStore", {
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true
    });

    const widgetLambda = new lambda.Function(this, "WidgetHandler", {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset("resources"),
      handler: "widgets.main",
      environment: {
        BUCKET: widgetBucket.bucketName
      }
    });

    widgetBucket.grantReadWrite(widgetLambda);

    const stageName = "dev";
    const restApi = new apigateway.RestApi(this, "widgetsApi", {
        restApiName: "WidgetService",
        description: "This service serves widgets.",
        retainDeployments: false,
        deployOptions: {
            stageName: stageName,
            cacheClusterEnabled: false,
        },
        endpointTypes: [
            apigateway.EndpointType.REGIONAL
        ],
    });

    const getWidgetsIntegration = new apigateway.LambdaIntegration(widgetLambda, {
      requestTemplates: { "application/json": '{ "statusCode": "200" }' }
    });
    restApi.root.addMethod("GET", getWidgetsIntegration);  // GET /

    const widget = restApi.root.addResource("{id}");
    const widgetIntegration = new apigateway.LambdaIntegration(widgetLambda);
    widget.addMethod("POST", widgetIntegration);   // POST /{id}
    widget.addMethod("GET", widgetIntegration);    // GET /{id}
    widget.addMethod("DELETE", widgetIntegration); // DELETE /{id}

    const webAclName = this.node.tryGetContext("WebACLName");
    const webAclScope = this.node.tryGetContext("WebACLScope");
    const webACLProps: wafv2.CfnWebACLProps = {
        name: webAclName,
        description: 'WAF + Salt PoC',
        defaultAction: {
            allow: {}
        },
        scope: webAclScope,
        visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            sampledRequestsEnabled: true,
            metricName: webAclName,
        },
    }
    const webACL = new wafv2.CfnWebACL(this, "WebACL", webACLProps);

    const apiGatewayStageArn = "arn:aws:apigateway:" + cdk.Stack.of(this).region + "::/restapis/" + restApi.restApiId + "/stages/" + stageName
    const webACLAssociation = new wafv2.CfnWebACLAssociation(this, 'WebACLAssociation', {
      resourceArn: apiGatewayStageArn,
      webAclArn: webACL.attrArn,
    });

    webACLAssociation.node.addDependency(restApi);
  }
}
