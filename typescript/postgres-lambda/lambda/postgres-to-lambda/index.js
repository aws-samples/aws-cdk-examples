/**
 * Lambda function that is called by PostgreSQL
 * 
 * This function can be invoked from PostgreSQL using the aws_lambda extension
 * Example SQL:
 * 
 * SELECT * FROM aws_lambda.invoke(
 *   aws_commons.create_lambda_function_arn('PostgresFunction', 'us-east-1'),
 *   '{"action": "process", "data": {"id": 123, "value": "test"}}',
 *   'Event'
 * );
 */
exports.handler = async (event) => {
  console.log('Event received from PostgreSQL:', JSON.stringify(event));
  
  try {
    // Process the event data
    const action = event.action || 'default';
    const data = event.data || {};
    
    let result;
    
    // Perform different actions based on the event
    switch (action) {
      case 'process':
        result = processData(data);
        break;
      case 'transform':
        result = transformData(data);
        break;
      case 'validate':
        result = validateData(data);
        break;
      default:
        result = { status: 'success', message: 'Default action performed', data };
    }
    
    return {
      statusCode: 200,
      body: result,
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: {
        status: 'error',
        message: error.message,
      },
    };
  }
};

/**
 * Process data from PostgreSQL
 */
function processData(data) {
  console.log('Processing data:', data);
  return {
    status: 'success',
    message: 'Data processed successfully',
    processedData: {
      ...data,
      processed: true,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Transform data from PostgreSQL
 */
function transformData(data) {
  console.log('Transforming data:', data);
  return {
    status: 'success',
    message: 'Data transformed successfully',
    transformedData: {
      ...data,
      transformed: true,
      uppercase: data.value ? data.value.toUpperCase() : null,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Validate data from PostgreSQL
 */
function validateData(data) {
  console.log('Validating data:', data);
  const isValid = data.id && data.value;
  return {
    status: isValid ? 'success' : 'error',
    message: isValid ? 'Data is valid' : 'Data is invalid',
    validationResult: {
      isValid,
      missingFields: !data.id ? ['id'] : !data.value ? ['value'] : [],
      timestamp: new Date().toISOString(),
    },
  };
}
