const AWS = require("aws-sdk");

const dynamoDB = new AWS.DynamoDB();

const params = {
  TableName: "UserPortfolios",
  KeySchema: [
    { AttributeName: "userId", KeyType: "HASH" }, // Partition key
    { AttributeName: "ticker", KeyType: "RANGE" }, // Sort key
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

dynamoDB.createTable(params, (err, data) => {
  if (err) {
    console.error("Error creating table:", err);
  } else {
    console.log("Table created successfully:", data);
  }
});
