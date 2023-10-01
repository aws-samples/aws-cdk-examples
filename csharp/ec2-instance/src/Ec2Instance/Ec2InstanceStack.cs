using Amazon.CDK;
using Amazon.CDK.AWS.EC2;
using Amazon.CDK.AWS.IAM;
using Amazon.CDK.AWS.S3.Assets;
using Constructs;

namespace Ec2Instance
{
    public class Ec2InstanceStack : Stack
    {
        internal Ec2InstanceStack(Construct scope, string id, IStackProps props = null) : base(scope, id, props)
    {

      //ToDO: Create KeyPair


      //Subnet config for VPC      
      SubnetConfiguration[] subnetConfigurations = GetSubnetConfigurations();

      // Create VPC with Subnet

      var vpc = GetVpc(subnetConfigurations);

      // Create Security Group
      SecurityGroup securityGroup = CreateSecurityGroup(vpc);

      // Add Ingress Rule 
      securityGroup.AddIngressRule(Peer.AnyIpv4(), Port.Tcp(22), "Allow SSH Access");

      // Create IAM Role
      Role role = CreateIamRole();

      // Add Managed Policy to Role

      role.AddManagedPolicy(ManagedPolicy.FromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"));

      AmazonLinuxImage ami = GetLinuxImageConfig();

      // Create Ec2 Instance
      var ec2Instance = CreateEC2Instance(vpc, securityGroup, role, ami);


      // Create Asset that will be used as a part of User Data to run on First Load
      CreateAssetAndRunCommand(ec2Instance);

      // Create outputs for connecting

      new CfnOutput(this,"IP Address",new CfnOutputProps{Value = ec2Instance.InstancePublicIp});

      // new CfnOutput(this, "Download Key Command",
      //       new CfnOutputProps { Value ="aws secretsmanager get-secret-value --secret-id ec2-ssh-key/cdk-keypair/private --query SecretString --output text > cdk-key.pem && chmod 400 cdk-key.pem" });

      new CfnOutput(this, "ssh Command",
            new CfnOutputProps { Value = "ssh -i cdk-key.pem -o IdentitiesOnly=yes ec2-user@" + ec2Instance.InstancePublicIp});


    }
    private  SubnetConfiguration[] GetSubnetConfigurations()
    {
      return new[]
            {
                   new SubnetConfiguration
                   {
                       CidrMask = 24,
                       Name = "asterisk",
                       SubnetType = SubnetType.PUBLIC
               }
    };


    }
    private Vpc GetVpc(SubnetConfiguration[] subnetConfigurations)
    {
      return new Vpc(this, "MyVPC", new VpcProps
      {
        NatGateways = 0,
        SubnetConfiguration = subnetConfigurations

      }

    );

    }
   private SecurityGroup CreateSecurityGroup(Vpc vpc)
    {

      // Allow SSH access (TCP port 22)

      return new SecurityGroup(this, "SecurityGroup",
          new SecurityGroupProps
          {
            Vpc = vpc,
            Description = "Allow SSH access on TCP Port 22 ",
            AllowAllOutbound = true

          });
    }

    private Role CreateIamRole()
    {
      return new Role(this, "ec2Role", new RoleProps
      {
        AssumedBy = new ServicePrincipal("ec2.amazonaws.com")
      });
    }

    private  AmazonLinuxImage GetLinuxImageConfig()
    {
      return new AmazonLinuxImage(new AmazonLinuxImageProps
      {
        Generation = AmazonLinuxGeneration.AMAZON_LINUX_2,
        CpuType = AmazonLinuxCpuType.ARM_64

      });
    }
  private Instance_  CreateEC2Instance(Vpc vpc, SecurityGroup securityGroup, Role role, AmazonLinuxImage ami)
    {
      var ec2Instance = new Instance_(this, "Instance", new InstanceProps
      {
        Vpc = vpc,
        InstanceType = InstanceType.Of(InstanceClass.BURSTABLE4_GRAVITON, InstanceSize.MICRO),
        MachineImage = ami,
        SecurityGroup = securityGroup,
        Role = role

      });
      return ec2Instance;
    }

    private Asset CreateAsset(){
      return new Asset(this,"Asset", new AssetProps{
        Path = "./src/configure.sh"
      });

    }

    private void CreateAssetAndRunCommand(Instance_ ec2Instance)
    {
      var asset = CreateAsset();

      var localPath = ec2Instance.UserData.AddS3DownloadCommand(
        new S3DownloadOptions
        {
          Bucket = asset.Bucket,
          BucketKey = asset.S3ObjectKey

        });

      ec2Instance.UserData.AddExecuteFileCommand(
        new ExecuteFileOptions
        {
          FilePath = localPath,
          Arguments = "--verbose -y"

        });
      asset.GrantRead(ec2Instance.Role);
    }

    

 

   

  

  

  }
}
