
import * as express from 'express'
import {Evidently} from "@aws-sdk/client-evidently";

const app = express();
const evidently = new Evidently({
  // Instead of calling the Evidently API to determine the feature variation, we call the AppConfig agent that we
  // added to our ECS task. The agent is essentially a local server we can call in place of the API.
  // By default, the AppConfig agent runs on port 2772. This is configurable:
  // https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-integration-lambda-extensions.html#w97aac17b7c21c21
  endpoint: 'http://localhost:2772',
  disableHostPrefix: true
});

app.get("/", async (_, res) => {
  try {
    console.time('latency')
    const evaluation = await evidently.evaluateFeature({
      project: 'WebPage',
      feature: 'SearchBar',
      entityId: 'WebPageVisitor43'
    })
    console.timeEnd('latency')
    res.send(evaluation.variation)
  } catch (err: any) {
    console.timeEnd('latency')
    res.send(err.toString())
  }
});

app.listen(80, function () {
  console.log("server started on port 80");
});
