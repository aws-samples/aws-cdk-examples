def on_event(event, context):
  print(event)
  request_type = event['RequestType']
  if request_type == 'Create': return on_create(event)
  if request_type == 'Update': return on_update(event)
  if request_type == 'Delete': return on_delete(event)
  raise Exception("Invalid request type: %s" % request_type)

def on_create(event):
  props = event["ResourceProperties"]
  print("Create new resource with props %s" % props)

  message = event['ResourceProperties']['Message']

  attributes = {
      'Response': 'Resource message "%s"' % message
  }
  return { 'Data': attributes }

def on_update(event):
  physical_id = event["PhysicalResourceId"]
  props = event["ResourceProperties"]
  print("Update resource %s with props %s" % (physical_id, props))
  # ...

  return { 'PhysicalResourceId': physical_id }

def on_delete(event):
  physical_id = event["PhysicalResourceId"]
  print("Delete resource %s" % physical_id)
  # ...

  return { 'PhysicalResourceId': physical_id }

def is_complete(event, context):
  physical_id = event["PhysicalResourceId"]
  request_type = event["RequestType"]

  # check if resource is stable based on request_type... fill in the blank below
  # is_ready = ...

  return { 'IsComplete': True }