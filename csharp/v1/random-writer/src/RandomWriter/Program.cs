using Amazon.CDK;

namespace RandomWriter
{
    public sealed class Program
    {
        public static void Main(string[] args)
        {
            var app = new App();
            new RandomWriterStack(app, "RandomWriterStack");
            app.Synth();
        }
    }
}
