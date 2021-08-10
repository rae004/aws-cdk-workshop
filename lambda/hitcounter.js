const  { DynamoDb, Lambda } = require('aws-sdk');

exports.handler = async function(event) {
    console.log('request:', JSON.stringify(event, undefined, 2));

    // creates clients for AWS SDK
    const dynamo = new DynamoDb();
    const lambda = new Lambda();

    // call dynamo entry for "Path" and increment hits (hits++)
    await dynamo.updateItem({
        TableName: process.env.HITS_TABLE_NAME,
        key: { path: { $: event.path } },
        UpdateExpressions: 'ADD hits :incr',
        ExpressionAttributeValues: { ':incr': { N: '1' } }
    }).promise();

    //call downstream function and capture response
    const resp = await lambda.invoke({
        FunctionName: process.env.DOWNSTREAM_FUNCTION_NAME,
        Payload: JSON.stringify(event)
    }).promise();

    console.log('downstream response:', JSON.stringify(resp, undefined, 2));

    return JSON.parse(resp.Payload);
};