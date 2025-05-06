def main(event, context):
    import logging as log
    log.getLogger().setLevel(log.INFO)

    # This needs to change if there are to be multiple resources in the same stack
    physical_id = 'TheOnlyCustomResource'

    try:
        log.info('Input event: %s', event)

        # Check if this is a Create and we're failing Creates
        if event['RequestType'] == 'Create' and event['ResourceProperties'].get('FailCreate', False):
            raise RuntimeError('Create failure requested')

        # Do the thing
        message = event['ResourceProperties']['message']
        attributes = {
            'Response': 'You said "%s"' % message
        }

        return { 'Data': attributes }
    except Exception as e:
        log.exception(e)
        return { 'Data': {} }
