import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: "us-east-2",
});

const docClient = DynamoDBDocumentClient.from(client);

// 1. Describe table structure
const describeTable = async () => {
  try {
    const data = await client.send(
      new DescribeTableCommand({ TableName: "UserPortfolios" })
    );
    console.log("Table structure:", JSON.stringify(data.Table, null, 2));
  } catch (err) {
    console.error("Error describing table:", err);
  }
};

// 2. View all items in table
const scanTable = async () => {
  try {
    const data = await docClient.send(
      new ScanCommand({ TableName: "UserPortfolios" })
    );
    console.log("Current items in table:", JSON.stringify(data.Items, null, 2));
    console.log("Total items:", data.Count);
  } catch (err) {
    console.error("Error scanning table:", err);
  }
};

// 3. Test adding an item
const testAddItem = async () => {
  const testItem = {
    userId: "test@example.com",
    ticker: "YMAG",
    totalShares: 100,
    purchaseDate: "2024-02-19",
    purchasePrice: 25.5,
    createdAt: new Date().toISOString(),
  };

  try {
    await docClient.send(
      new PutCommand({
        TableName: "UserPortfolios",
        Item: testItem,
      })
    );
    console.log("Test item added successfully:", testItem);
  } catch (err) {
    console.error("Error adding test item:", err);
  }
};

// Run all checks
const runAllChecks = async () => {
  console.log("\n1. Checking table structure...");
  await describeTable();

  console.log("\n2. Current table contents...");
  await scanTable();

  console.log("\n3. Testing item addition...");
  await testAddItem();

  console.log("\n4. Verifying addition...");
  await scanTable();
};

runAllChecks();
