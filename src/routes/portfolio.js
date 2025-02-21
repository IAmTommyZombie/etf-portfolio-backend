import express from "express";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

const router = express.Router();

const client = new DynamoDBClient({
  region: "us-east-2",
});

const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "UserPortfolios";

// Add ETF to portfolio
router.post("/add", async (req, res) => {
  try {
    console.log("Received portfolio data:", req.body);

    const { userId, ticker, totalShares, purchaseDate, purchasePrice } =
      req.body;

    if (!userId || !ticker || !totalShares || !purchaseDate || !purchasePrice) {
      console.log("Missing required fields:", {
        userId,
        ticker,
        totalShares,
        purchaseDate,
        purchasePrice,
      });
      return res.status(400).json({ error: "Missing required fields" });
    }

    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        userId: userId,
        ticker: ticker,
        totalShares: Number(totalShares),
        purchaseDate: purchaseDate,
        purchasePrice: Number(purchasePrice),
        createdAt: new Date().toISOString(),
      },
    });

    await docClient.send(command);
    console.log("Successfully added to DynamoDB");

    res.status(200).json({
      message: "ETF added to portfolio successfully",
      data: command.input.Item,
    });
  } catch (error) {
    console.error("Server error adding ETF to portfolio:", error);
    res.status(500).json({
      error: "Failed to add ETF to portfolio",
      details: error.message,
    });
  }
});

// Get user's portfolio
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    console.log("Fetching portfolio for user:", userId);

    const command = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId,
      },
    });

    const result = await docClient.send(command);
    console.log("Portfolio fetch result:", result);

    res.status(200).json(result.Items);
  } catch (error) {
    console.error("Server error fetching portfolio:", error);
    res.status(500).json({
      error: "Failed to fetch portfolio",
      details: error.message,
    });
  }
});

export default router;
