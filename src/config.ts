// import * as path from 'path';
import * as dotenv from 'dotenv';
// import { getWorkingDir } from './helpers/getWorkingDir.js';

// parse the env file
// running dotenv.config exposes the env variables as process.env
dotenv.config();


/**
 * Interface to load env variables
 * Note these variables can possibly be undefined, as someone could skip these varibales or not setup a .env file at all
 * By having 2 interfaces, we can require typings and give the user tooltip suggestions based on the variables they saved in .env
 * Any variables that could be there but are undefined are not exposed to the rest of the app
 */


/**
 * Set the types required in the env file
 *
 * This list should include all required values in the .env file
 * As the program grows, this list will need to be updated
 * By allowing for type: undefined, it allows for checking whether the user defined the required variables
 */

interface ENV {
    TOKEN: string | undefined;
    CLIENT_ID: string | undefined;
    GUILD_ID: string | undefined;
    PGUSER: string | undefined;
    PGPASSWORD: string | undefined;
    PGHOST: string | undefined;
    PGPORT: number | undefined;
    PGDATABASE: string | undefined;
    SQLUSER: string | undefined;
    SQLPASSWORD: string | undefined;
    SQLHOST: string | undefined;
    SQLPORT: number | undefined;
    SQLDATABASE: string | undefined;
    SQLSOCKETPATH: string | undefined;
    INTERNAL_DATA_PATH: string | undefined;
    // ...
}

/**
 * Set the type exposed to the app
 *
 * Should the entry exist, this is the type that it needs to be (will be the same as above, sans ' | undefined ')
 * Undefined is not allowed here beceause they need to be defined for the app to run
 */
export enum Modes {
    Dev = 'dev',
    Production = 'production',
}

interface Config {
    TOKEN: string;
    CLIENT_ID: string;
    GUILD_ID: string;
    PGUSER: string;
    PGPASSWORD: string;
    PGHOST: string;
    PGPORT: number;
    PGDATABASE: string;
    MODE: Modes;
    SQLUSER: string;
    SQLPASSWORD: string;
    SQLHOST: string;
    SQLPORT: number;
    SQLDATABASE: string;
    SQLSOCKETPATH: string;
    INTERNAL_DATA_PATH: string;
    // ...
}


/**
 * Loads the env variables and assigns them the ENV types
 * @returns typeset process.env
 * Note that process.env returns strings on each entry
 */

const getConfig = (): ENV => {
    return {
        TOKEN: process.env.TOKEN,
        CLIENT_ID: process.env.CLIENT_ID,
        GUILD_ID: process.env.GUILD_ID,
        PGUSER: process.env.PGUSER,
        PGPASSWORD: process.env.PGPASSWORD || '',
        PGHOST: process.env.PGHOST,
        PGPORT: parseInt(process.env.PGPORT || '', 10),
        PGDATABASE: process.env.PGDATABASE,
        SQLUSER: process.env.SQLUSER,
        SQLPASSWORD: process.env.SQLPASSWORD || '',
        SQLHOST: process.env.SQLHOST || '',
        SQLPORT: parseInt(process.env.SQLPORT || '', 10),
        SQLDATABASE: process.env.SQLDATABASE,
        SQLSOCKETPATH: process.env.SQLSOCKETPATH || '',
        INTERNAL_DATA_PATH: process.env.INTERNAL_DATA_PATH,
        // ...
    };
};

/**
 * Checks whether the required variables are defined as they should be before exposing it to the rest of the client
 *
 * @param config Object containing the environment varaibles
 * @returns config typed as Config
 *
 * If the values in Config are undefined, the user did not define a required env variable. Throw and quit.
 * If everything is defined as it should be, retype config as config: Config
 */

const getSanitzedConfig = (config: ENV): Config => {
    // loop through the required entries in the Config interface
    for (const [key, value] of Object.entries(config)) {
        // if any of these entries are undefined, the user did not specify them (or you didn't update the interface)
        // throw an error and quit execution of the app
        if (value === undefined) {
            throw new Error(`Missing key ${key} in .env`);
        }
    }
    // if everything is defined as it should be, save to config: Config
    return config as Config;
};

// load the env variables from .env into our object config: ENV
const envConfig = getConfig();

// check for undefined entries
export const botConfig = getSanitzedConfig(envConfig);

// assign the run mode
botConfig.MODE = botConfig.CLIENT_ID === '1040375769798557826' ? Modes.Dev : Modes.Production;

// expose the typed object to the client
// export default sanitizedConfig;
