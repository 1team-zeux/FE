import ec2Url from '@/assets/aws-icons/ec2.svg?url'
import rdsUrl from '@/assets/aws-icons/rds.svg?url'
import elbUrl from '@/assets/aws-icons/elb.svg?url'
import lambdaUrl from '@/assets/aws-icons/lambda.svg?url'
import eksUrl from '@/assets/aws-icons/eks.svg?url'
import ecsUrl from '@/assets/aws-icons/ecs.svg?url'
import apigwUrl from '@/assets/aws-icons/apigw.svg?url'
import cloudwatchUrl from '@/assets/aws-icons/cloudwatch.svg?url'
import route53Url from '@/assets/aws-icons/route53.svg?url'
import s3Url from '@/assets/aws-icons/s3.svg?url'
import vpcUrl from '@/assets/aws-icons/vpc.svg?url'

export const NODE_ICONS: Record<string, string> = {
  ec2: ec2Url, rds: rdsUrl, elb: elbUrl, lambda: lambdaUrl,
  eks: eksUrl, ecs: ecsUrl, apigw: apigwUrl, cloudwatch: cloudwatchUrl,
  route53: route53Url, s3: s3Url, vpc: vpcUrl, nat: elbUrl, igw: route53Url,
  elasticache: rdsUrl, vpn: vpcUrl, kms: s3Url, eventbridge: lambdaUrl, 'external-api': apigwUrl,
}
