const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");

const client = new DynamoDBClient({ region: "eu-central-1" });

const carsTableName = 'cardata-cars';
const defectsTableName = 'cardata-defects';

// Load cars data from JSON file
const carsData = require("../data/cars.json");
const defectsData = require("../data/defects.json");

// Function to convert car object to DynamoDB PutItemInput
const convertToPutItemInput = (table, prop) => {
    return {
        TableName: table,
        Item: prop,
    };
};

// Function to execute PutItemCommand with a delay
const executeWithDelay = async (command) => {
    return new Promise(resolve => {
        setTimeout(async () => {
            await client.send(command);
            resolve();
        }, 250); // Delay of 250ms second between each execution
    });
};

// Function to process cars data
const processCarsData = async () => {
    for (let i = 0; i < carsData.length; i++) {
        console.log(`[${i + 1}/${carsData.length + 1}] - Pushing car with license plate ${carsData[i].licenseplate.S} to DynamoDB.`);
        const input = convertToPutItemInput(carsTableName, carsData[i]);
        const command = new PutItemCommand(input);
        await executeWithDelay(command);
    }
};

// Function to process cars data
const processDefectsData = async () => {
    for (let i = 0; i < defectsData.length; i++) {
        console.log(`[${i + 1}/${defectsData.length + 1}] - Pushing defect with license plate ${defectsData[i].licenseplate.S} to DynamoDB.`);
        const input = convertToPutItemInput(defectsTableName, defectsData[i]);
        const command = new PutItemCommand(input);
        await executeWithDelay(command);
    }
};

// Execute the process
processCarsData()
    .then(() => console.log("Car Data pushed to DynamoDB with a rate of 4 records per second."))
    .catch(err => console.error("Error:", err));

processDefectsData()
    .then(() => console.log("Defect Data pushed to DynamoDB with a rate of 4 records per second."))
    .catch(err => console.error("Error:", err));