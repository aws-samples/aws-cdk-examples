using Amazon.CDK;
using Amazon.CDK.AWS.EC2;
using Amazon.CDK.AWS.SSM;
using Constructs;

namespace Ec2InstanceDevServer;

internal class Ec2Stack : NestedStack
{
    public IInstance Ec2Instance { get; }

    public string KeyPairName { get; set; } = "dev-server-key-pair";
    public IStringParameter KeyPairPrivateKey { get; }

    public Ec2Stack(Construct scope, string id, IVpc vpc, INestedStackProps props = null) : base(scope, id, props)
    {
        var rootDevice = GetBlockDevice();
        var userData = GetUserData();
        var instanceAmi = GetMachineImage(userData);
        var instanceSg = GetSecurityGroup(vpc);

        // To use an existing key pair replace with
        //keypair = KeyPair.FromKeyPairName(this, "dev-server-key-pair", "<key pair name>");
        var keypair = new KeyPair(this, "keypair", new KeyPairProps
        {
            KeyPairName = KeyPairName
        });

        KeyPairPrivateKey = keypair.PrivateKey;

        var ec2Instance = new Instance_(this, "DevServer", new InstanceProps
        {
            InstanceType = InstanceType.Of(InstanceClass.M5, InstanceSize.XLARGE),
            Vpc = vpc,
            MachineImage = instanceAmi,
            VpcSubnets = new SubnetSelection
            {
                SubnetType = SubnetType.PRIVATE_WITH_EGRESS
            },
            KeyPair = keypair,
            SecurityGroup = instanceSg,
            BlockDevices = new IBlockDevice[]
            {
                rootDevice
            },
        });
        
        Ec2Instance = ec2Instance;
    }

    private SecurityGroup GetSecurityGroup(IVpc vpc)
    {
        // Update security group with specific client IP address
        var instanceSg = new SecurityGroup(this, "DevServerSg", new SecurityGroupProps
        {
            Vpc = vpc,
            AllowAllOutbound = true,
            Description = "Dev Server SG"
        });

        instanceSg.Connections.AllowFrom(Peer.AnyIpv4(), Port.Tcp(22), "SSH");
        return instanceSg;
    }

    private static BlockDevice GetBlockDevice()
    {
        var rootDevice = new BlockDevice
        {
            DeviceName = "/dev/sda1",
            Volume = BlockDeviceVolume.Ebs(30, new EbsDeviceOptions
            {
                DeleteOnTermination = true,
                Encrypted = true,
                VolumeType = EbsDeviceVolumeType.GP2
            })
        };
        return rootDevice;
    }

    private static UserData GetUserData()
    {
        // Install dotnet, docker, etc. and register dev ssl, certificates for debugging
        var userData = UserData.ForLinux();
        userData.AddCommands(
            "#!/bin/bash",
            "apt-get update",
            "apt-get install -y dotnet-sdk-6.0",
            "dotnet dev-certs https --trust",
            "apt-get install -y apt-transport-https ca-certificates curl software-properties-common",
            "curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -",
            "add-apt-repository \"deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable\"",
            "apt-get update",
            "apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin",
            "usermod -aG docker ubuntu",
            "id ubuntu",
            "newgrp docker"
        );
        return userData;
    }

    private static IMachineImage GetMachineImage(UserData userData)
    {
        var instanceAmi = MachineImage.FromSsmParameter(
            "/aws/service/canonical/ubuntu/server/jammy/stable/current/amd64/hvm/ebs-gp2/ami-id",
            new SsmParameterImageOptions
            {
                Os = OperatingSystemType.LINUX,
                UserData = userData
            });
        return instanceAmi;
    }
}