import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Get an environment variable or throw an error if it is not set, unless the 
 * missing parameter is provided, in which case that string is returned.
 */
export const getEnv = (name:string, missing?:string) : string => {
    let env = process.env[name];
    if (!env && missing === undefined) {
        throw Error(`${name} environment variable not set`);
    }
    if (!env) {
        env = missing;
    }
    return env || '';
};

/**
 * This only exists to suppress errors from unit tests when we want to 
 * test for something throwing an exception.
 * 
 * You should probably have a better logging class...
 */
export class Log {

    public static IsTest = false;

    public static Error(err:any) {
        if (!Log.IsTest) {
            console.error(err);
        }
    }
}