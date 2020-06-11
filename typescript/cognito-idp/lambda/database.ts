import { User } from './entities/user';
import * as uuid from 'uuid';

/**
 * This class abstracts database access for use by API endpoint handlers.
 *
 * Inputs and outputs are all in camelCase for consumption by the front end.
 * 
 * This is another opinionated sample... there are lots of way to do this.
 */
export class Database {

    constructor(private ddb: AWS.DynamoDB, private userTable:string) {}

    /**
     * Convert a DynamoDB user to a User object.
     */
    private userConvert(item: any): User {

        const user: User = {
            'id': item.id.S,
            'username': item.username.S,
            'firstName': item.first_name.S,
            'lastName': item.last_name.S,
            'emailAddress': item.email_address.S,
            'isSuperAdmin': item.is_super_admin ? item.is_super_admin.BOOL : false
        };

        if (item.created_on) {
            user.createdOn = item.created_on.S;
        }
        if (item.updated_on) {
            user.updatedOn = item.updated_on.S;
        }

        return user;
    }

    /**
     * Get all users.
     */
    public async usersGet(): Promise<User[]> {

        const users = [];

        const resp = await this.ddb.scan({
            TableName: this.userTable
        }).promise();

        if (resp.Items) {
            for (const item of resp.Items) {
                users.push(this.userConvert(item));
            }
        }

        return users;

    }

    /**
     * Get a user
     */
    public async userGet(userId: string) {

        const response = await this.ddb.getItem({
            TableName: this.userTable,
            Key: {
                'id': {
                    'S': userId
                }
            }
        }).promise();

        if (response.Item) {
            return this.userConvert(response.Item);
        }

        return null;
    }

    /**
     * Get a user by username.
     */
    public async userGetByUsername(username:string) : Promise<User | null> {

        const response = await this.ddb.query({
            ExpressionAttributeValues: {
                ':u': {
                    'S': username,
                },
            },
            IndexName: 'username-index',
            KeyConditionExpression: 'username = :u',
            TableName:this.userTable
        }).promise();

        if (response.Items?.length) {
            return this.userConvert(response.Items[0]);
        }

        return null;
    }

    /**
     * The id field is optional. If not included, a new user is created.
     *
     * Returns the id.
     *
     * Returns false if the username is already taken.
     */
    public async userSave(user: any): Promise<string | boolean> {

        let isNewUser = false;

        if (!user.id) {
            user.id = uuid.v4();

            isNewUser = true;

            const exResp = await this.ddb.query({
                ExpressionAttributeValues: {
                    ':u': {
                        'S': user.username,
                    },
                },
                IndexName: 'username-index',
                KeyConditionExpression: 'username = :u',
                TableName: this.userTable,
            }).promise();

            if (exResp.Items?.length) {
                console.log(`User with username ${user.username} already exists`);
                return false;
            }
        }

        const expressionAttributeValues:any = {
            ':username': {
                'S': user.username,
            },
            ':emailAddress': {
                'S': user.emailAddress,
            },
            ':firstName': {
                'S': user.firstName,
            },
            ':lastName': {
                'S': user.lastName,
            }
        };

        let updateExpression = 'SET username = :username,' +
        ' email_address = :emailAddress,' +
        ' first_name = :firstName, ' +
        ' last_name = :lastName';

        const now = new Date().toISOString();

        if (isNewUser) {
            expressionAttributeValues[':createdOn'] = {
                'S': now
            };
            updateExpression += ', created_on = :createdOn';
        } else {
            expressionAttributeValues[':updatedOn'] = {
                'S': now
            };
            updateExpression += ', updated_on = :updatedOn';
        }

        // Upsert the record (creates a new item if it doesn't exist)
        await this.ddb.updateItem({
            ExpressionAttributeValues: expressionAttributeValues,
            Key: {
                'id': {
                    'S': user.id,
                }
            },
            TableName: this.userTable,
            UpdateExpression: updateExpression
        }).promise();

        return user.id;

    }

    /**
     * Delete a user.
     */
    public async userDelete(userId: string) {
        await this.ddb.deleteItem({
            TableName: this.userTable,
            Key: {
                'id': {
                    'S': userId
                }
            }
        }).promise();
    }

}