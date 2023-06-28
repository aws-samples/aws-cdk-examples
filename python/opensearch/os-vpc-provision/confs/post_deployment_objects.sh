#!/bin/bash
echo -e "Starting OpenSearch Dashboards alerts and dashboard generation"

# It takes some time to get domain created, and gives Access denied error. Adding a sleep of 60 second so as domain gets created before running the POST commands.
sleep 60;
curl -s -XGET -u DOMAIN_ADMIN_UNAME:DOMAIN_ADMIN_PW 'https://DOMAIN_ENDPOINT'
sleep 10;

# Sample to add backend role with OpenSearch Service
curl -s -XPATCH -u DOMAIN_ADMIN_UNAME:DOMAIN_ADMIN_PW 'https://DOMAIN_ENDPOINT/_opendistro/_security/api/rolesmapping/all_access' -H 'Content-Type: application/json' -d '[ {"op":"add","path":"/backend_roles","value":["role_arn_here"]} ] '

################# Import Dashboards ###################
# Generate auth for Default Dashboards
curl -XPOST 'https://DOMAIN_ENDPOINT/_dashboards/auth/login' -H "osd-xsrf: true" -H "content-type:application/json" -d '{"username":"DOMAIN_ADMIN_UNAME", "password" : "DOMAIN_ADMIN_PW"} ' -c auth.txt

# Load Default Dashboard
curl -XPOST 'https://DOMAIN_ENDPOINT/_dashboards/api/saved_objects/_import' -H "osd-xsrf:true" -b auth.txt --form file=@export_opensearch_dashboards_web_logs.ndjson


################# Index Templates and ISM ###################
# Sample to create ISM policy to delete data after 366 days for logs-*
curl -s -XPUT -u DOMAIN_ADMIN_UNAME:DOMAIN_ADMIN_PW "https://DOMAIN_ENDPOINT/_opendistro/_ism/policies/domains" -H 'Content-Type: application/json' -d'{"policy":{"ism_template":{"index_patterns" : ["logs-*"]},"policy_id":"domains","description":"hot-delete workflow","last_updated_time":1612206385815,"schema_version":1,"error_notification":null,"default_state":"hot","states":[{"name":"hot","actions":[],"transitions":[{"state_name":"delete","conditions":{"min_index_age":"366d"}}]},{"name":"delete","actions":[{"delete":{}}],"transitions":[]}]}}'

# Create Template
curl -s -XPUT -u DOMAIN_ADMIN_UNAME:DOMAIN_ADMIN_PW "https://DOMAIN_ENDPOINT/_template/logs" -H 'Content-Type: application/json' -d'{"index_patterns":["logs-*"],"settings":{"number_of_shards":1,"number_of_replicas":1}}'

################# ALERTS CREATION ###################

# Create Destination for E-mail alert
destination_id=`curl -s -XPOST -u DOMAIN_ADMIN_UNAME:DOMAIN_ADMIN_PW 'https://DOMAIN_ENDPOINT/_opendistro/_alerting/destinations' -H 'Content-Type: application/json' -d'{"name":"sample_email","type":"sns","sns":{"role_arn":"SNS_ROLE_ARN","topic_arn":"SNS_TOPIC_ARN"}}' | jq -r '._id'`

# Sample to create Monitor for Cluster Status Yellow and send an alert if its yellow for last 30 mins
curl -s -XPOST -u DOMAIN_ADMIN_UNAME:DOMAIN_ADMIN_PW 'https://DOMAIN_ENDPOINT/_opendistro/_alerting/monitors' -H 'Content-Type: application/json' -d'{"type":"monitor","name":"cluster_health_yellow","enabled":true,"schedule":{"period":{"interval":30,"unit":"MINUTES"}},"inputs":[{"search":{"indices":["domains-*"],"query":{"size":0,"aggs":{"domain_yellow":{"terms":{"field":"domain_name.keyword","size":25}}},"query":{"bool":{"filter":[{"range":{"@timestamp":{"from":"{{period_end}}||-30m","to":"{{period_end}}","include_lower":true,"include_upper":true,"format":"epoch_millis","boost":1}}},{"term":{"ClusterStatus.yellow":{"value":1,"boost":1}}}]}}}}}],"triggers":[{"name":"cluster_health_yellow","severity":"3","condition":{"script":{"source":"ctx.results[0].hits.total.value > 0","lang":"painless"}},"actions":[{"name":"cluster_health_yellow_alert","destination_id":"'$destination_id'","message_template":{"source":"One or more of your cluster health has been turned into YELLOW between {{ctx.periodStart}} and {{ctx.periodEnd}}, Please find below details about the domain for further actions and troubleshooting. \n\n- Severity: {{ctx.trigger.severity}}\n- Domain names: \n  {{#ctx.results.0.aggregations.domain_yellow.buckets}} \n    {{key}} https://'$InstanceIP'/_dashboards/app/dashboards#/view/19087650-454f-11eb-87ad-632020bc8bdf?_a=(query:(language:kuery,query:%27domain_name%20:%20%22{{key}}%22%27)) \n{{/ctx.results.0.aggregations.domain_yellow.buckets}}","lang":"mustache"},"throttle_enabled":false,"subject_template":{"source":"cluster_health_yellow_alert"}}]}]}'

# Sample to create Monitor for Cluster when CPUUtilization is > 80% in last 15 mins
curl -s -XPOST -u DOMAIN_ADMIN_UNAME:DOMAIN_ADMIN_PW 'https://DOMAIN_ENDPOINT/_opendistro/_alerting/monitors' -H 'Content-Type: application/json' -d'{"type":"monitor","name":"CPUUtilization","enabled":true,"schedule":{"period":{"interval":15,"unit":"MINUTES"}},"inputs":[{"search":{"indices":["domains-*"],"query":{"size":0,"aggs":{"CPUUtilization":{"terms":{"field":"domain_name.keyword","size":25}}},"query":{"bool":{"filter":[{"range":{"@timestamp":{"from":"{{period_end}}||-15m","to":"{{period_end}}","include_lower":true,"include_upper":true,"format":"epoch_millis","boost":1}}},{"range":{"CPUUtilization":{"gte":80}}}]}}}}}],"triggers":[{"name":"CPUUtilization","severity":"1","condition":{"script":{"source":"ctx.results[0].hits.total.value > 0","lang":"painless"}},"actions":[{"name":"CPUUtilization_Alert","destination_id":"'$destination_id'","message_template":{"source":"CPU of one or more of your Domain has reached 80% between {{ctx.periodStart}} and {{ctx.periodEnd}}, Please find below details about the domain for further actions and troubleshooting. \n\n- Severity: {{ctx.trigger.severity}}\n- Domain names: \n  {{#ctx.results.0.aggregations.CPUUtilization.buckets}} \n    {{key}} https://'$InstanceIP'/_dashboards/app/dashboards#/view/19087650-454f-11eb-87ad-632020bc8bdf?_a=(query:(language:kuery,query:%27domain_name%20:%20%22{{key}}%22%27)) \n{{/ctx.results.0.aggregations.CPUUtilization.buckets}}","lang":"mustache"},"throttle_enabled":false,"subject_template":{"source":"CPUUtilization_Alert"}}]}]}'

echo -e "Completed Dashboards alerts and dashboard generation"

