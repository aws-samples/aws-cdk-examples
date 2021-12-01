using Amazon.CDK;
using Amazon.CDK.AWS.IAM;
using Amazon.CDK.AWS.S3;
using Constructs;
using System.Collections.Generic;
using System.Linq;

namespace StepfunctionsJobPoller
{
    public class StepfunctionsJobPollerConstructProps
    {
        public int BucketCount { get; set; }
    }

    public class StepfunctionsJobPollerConstruct : Construct
    {
        private readonly IEnumerable<Bucket> _buckets;

        // A simple construct that contains a collection of AWS S3 buckets.
        public StepfunctionsJobPollerConstruct(Construct scope, string id, StepfunctionsJobPollerConstructProps props) : base(scope, id)
        {
            _buckets = Enumerable.Range(0, props.BucketCount)
                .Select(i => new Bucket(this, $"Bucket{i}"))
                .ToList();

        }

        // Give the specified principal read access to the buckets in this construct.
        public void GrantRead(IPrincipal principal)
        {
            foreach (Bucket bucket in _buckets)
            {
                bucket.GrantRead(principal, "*");
            }
        }
    }
}
