#!/bin/bash

# Create the ETFPrices table
aws dynamodb create-table \
    --table-name ETFPrices \
    --attribute-definitions \
        AttributeName=symbol,AttributeType=S \
        AttributeName=timestamp,AttributeType=S \
    --key-schema \
        AttributeName=symbol,KeyType=HASH \
        AttributeName=timestamp,KeyType=RANGE \
    --provisioned-throughput \
        ReadCapacityUnits=5,WriteCapacityUnits=5

echo "DynamoDB table 'ETFPrices' created successfully" 