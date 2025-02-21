import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { CreateTableCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({
  region: "us-east-2",
});

const params = {
  TableName: "UserPortfolios",
  KeySchema: [
    { AttributeName: "userId", KeyType: "HASH" },
    { AttributeName: "ticker", KeyType: "RANGE" },
  ],
  AttributeDefinitions: [
    { AttributeName: "userId", AttributeType: "S" },
    { AttributeName: "ticker", AttributeType: "S" },
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 5,
    WriteCapacityUnits: 5,
  },
};

const createTable = async () => {
  try {
    const data = await client.send(new CreateTableCommand(params));
    console.log("Table created successfully:", data);
  } catch (err) {
    console.error("Error creating table:", err);
  }
};

createTable();
