const express = require("express");
const router = express.Router();
const AWS = require("aws-sdk");

// Configure AWS
AWS.config.update({
  region: "us-east-2", // or your preferred region
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = "UserPortfolios";

// Add ETF to user's portfolio
router.post("/add", async (req, res) => {
  try {
    console.log("Received portfolio data:", req.body); // Debug log

    const { userId, ticker, totalShares, purchaseDate, purchasePrice } =
      req.body;

    // Validate input
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

    const params = {
      TableName: TABLE_NAME,
      Item: {
        userId: userId,
        ticker: ticker,
        totalShares: Number(totalShares),
        purchaseDate: purchaseDate,
        purchasePrice: Number(purchasePrice),
        createdAt: new Date().toISOString(),
      },
    };

    console.log("DynamoDB params:", params); // Debug log

    await dynamoDB.put(params).promise();
    console.log("Successfully added to DynamoDB");

    res.status(200).json({
      message: "ETF added to portfolio successfully",
      data: params.Item,
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
    console.log("Fetching portfolio for user:", userId); // Debug log

    const params = {
      TableName: TABLE_NAME,
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId,
      },
    };

    const result = await dynamoDB.query(params).promise();
    console.log("Portfolio fetch result:", result); // Debug log

    res.status(200).json(result.Items);
  } catch (error) {
    console.error("Server error fetching portfolio:", error);
    res.status(500).json({
      error: "Failed to fetch portfolio",
      details: error.message,
    });
  }
});

module.exports = router;
