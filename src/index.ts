import { DynamoDB } from 'aws-sdk';

export const deadLetterProcessor = async (event: AWSLambda.SNSEvent) => {
    const updates = [];
    let result: any = { success: true, updates, event };

    for (const bounceEvent of event.Records) {
        let { Message } = bounceEvent.Sns;
        let messageId;

        if (typeof Message === 'string') {
            console.log('converting Message from string to object ', Message);
            Message = JSON.parse(Message);
        }

        messageId = (Message as any)?.mail?.messageId;

        console.log('messageId ', messageId);

        if (messageId) {
            const dynamodb = new DynamoDB.DocumentClient();
            const tableName = process.env.TABLE_NAME;

            const params = {
                TableName: tableName,
                Key: {
                    id: messageId
                },
                UpdateExpression: 'set sentTraceData=:r',
                ExpressionAttributeValues: {
                    ':r': bounceEvent.Sns.Message
                },
                ReturnValues: 'UPDATED_NEW'
            };
            console.log(`Processing email bounced!`);

            const dbUpdateResult = await dynamodb.update(params).promise();

            console.log('Item updated with email bounce data on table: ' + tableName);

            updates.push({
                dbUpdateResult,
                bounceEvent: bounceEvent.Sns.Message
            });
        }
    }

    console.log(result);
    return result;
};
