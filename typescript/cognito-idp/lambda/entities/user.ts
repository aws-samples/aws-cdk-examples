/**
 * A user.
 */
export class User {
    public id: string;
    public username: string;
    public firstName: string;
    public lastName: string;
    public emailAddress: string;
    public createdOn?: string;
    public updatedOn?: string;
    public isSuperAdmin?: boolean;
}