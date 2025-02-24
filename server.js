import express from "express";
import cors from "cors";
import fs from "fs/promises";
import path from "path";
import fetch from "node-fetch";
import bcrypt from "bcrypt";

const app = express();
app.use(cors());
app.use(express.json());

const PORTFOLIOS_FILE = path.join(process.cwd(), "portfolios.json");
const DISTRIBUTIONS_FILE = path.join(process.cwd(), "distributions.json");
const PRICES_CACHE_FILE = path.join(process.cwd(), "prices_cache.json");
const USERS_FILE = path.join(process.cwd(), "users.json");

const ETF_GROUPS = {
  Weekly: ["YMAG", "YMAX", "LFGY", "GPTY"],
  "Group A": [
    "TSLY",
    "GOOY",
    "YBIT",
    "OARK",
    "XOMO",
    "TSMY",
    "CRSH",
    "FIVY",
    "FEAT",
  ],
  "Group B": ["NVDY", "FBY", "GDXY", "JPMO", "MRNY", "MARO", "PLTY"],
  "Group C": ["CONY", "MSFO", "AMDY", "NFLY", "PYPY", "ULTY", "ABNY"],
  "Group D": ["MSTY", "AMZY", "APLY", "DISO", "SQY", "SMCY", "AIYY"],
};

const ALL_ETFS = Object.values(ETF_GROUPS).flat();
const SALT_ROUNDS = 10; // For bcrypt hashing

const initializeFiles = async () => {
  for (const file of [
    PORTFOLIOS_FILE,
    DISTRIBUTIONS_FILE,
    PRICES_CACHE_FILE,
    USERS_FILE,
  ]) {
    try {
      await fs.access(file);
    } catch {
      const initialData = file === USERS_FILE ? {} : {}; // Empty users.json initially
      await fs.writeFile(file, JSON.stringify(initialData), "utf8");
      console.log(`Initialized ${path.basename(file)}`);
    }
  }
};
initializeFiles();

const readFile = async (filePath) => {
  const data = await fs.readFile(filePath, "utf8");
  return JSON.parse(data);
};

const writeFile = async (filePath, data) => {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
};

const fetchYahooPrice = async (symbol) => {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      }
    );
    const data = await response.json();
    if (!response.ok || !data.chart.result?.[0]?.meta) {
      throw new Error(`Failed to fetch data for ${symbol}`);
    }
    const meta = data.chart.result[0].meta;
    return {
      name: meta.shortName || symbol,
      price: meta.regularMarketPrice,
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return null;
  }
};

app.get("/api/yahoo/price/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const priceData = await fetchYahooPrice(symbol);
    if (!priceData) throw new Error(`Failed to fetch price for ${symbol}`);
    res.json(priceData);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch price" });
  }
});

app.get("/api/etf/prices", async (req, res) => {
  try {
    const cachedPrices = await readFile(PRICES_CACHE_FILE);
    const prices = {};
    const now = Date.now();

    for (const ticker of ALL_ETFS) {
      const cached = cachedPrices[ticker];
      if (cached && now - new Date(cached.updatedAt).getTime() < 300000) {
        prices[ticker] = cached;
      } else {
        const priceData = await fetchYahooPrice(ticker);
        if (priceData) {
          prices[ticker] = priceData;
          cachedPrices[ticker] = priceData;
        }
      }
    }

    await writeFile(PRICES_CACHE_FILE, cachedPrices);
    res.json(
      Object.entries(prices).map(([symbol, data]) => ({ symbol, ...data }))
    );
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch prices" });
  }
});

app.post("/api/signup", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const users = await readFile(USERS_FILE);
    if (users[username]) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    users[username] = hashedPassword;
    await writeFile(USERS_FILE, users);

    res.json({ message: "Account created successfully", username });
  } catch (error) {
    res.status(500).json({ error: "Signup failed" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const users = await readFile(USERS_FILE);
    const hashedPassword = users[username];
    if (!hashedPassword || !(await bcrypt.compare(password, hashedPassword))) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    res.json({ message: "Login successful", username });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

app.get("/api/portfolio/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const portfolios = await readFile(PORTFOLIOS_FILE);
    res.json(portfolios[username] || []);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch portfolio" });
  }
});

app.post("/api/portfolio/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const { ticker, totalShares, purchaseDate, purchasePrice } = req.body;

    if (!ticker || !totalShares || !purchaseDate || !purchasePrice) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const portfolios = await readFile(PORTFOLIOS_FILE);
    const userPortfolio = portfolios[username] || [];

    const newItem = {
      ticker,
      totalShares: Number(totalShares),
      purchaseDate,
      purchasePrice: Number(purchasePrice),
      createdAt: new Date().toISOString(),
    };

    userPortfolio.push(newItem); // Always append, no merge
    portfolios[username] = userPortfolio;
    await writeFile(PORTFOLIOS_FILE, portfolios);

    res.json({ message: "ETF added successfully", data: newItem });
  } catch (error) {
    res.status(500).json({ error: "Failed to add ETF" });
  }
});

app.delete("/api/portfolio/:username/:ticker", async (req, res) => {
  try {
    const { username, ticker } = req.params;
    const portfolios = await readFile(PORTFOLIOS_FILE);
    const userPortfolio = portfolios[username] || [];
    portfolios[username] = userPortfolio.filter(
      (item) => item.ticker !== ticker
    );
    await writeFile(PORTFOLIOS_FILE, portfolios);
    res.json({ message: `Deleted ${ticker} from portfolio` });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete ETF" });
  }
});

app.get("/api/distributions/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const distributions = await readFile(DISTRIBUTIONS_FILE);
    res.json(distributions[username] || []);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch distributions" });
  }
});

app.post("/api/distributions/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const { etfSymbol, amount, date } = req.body;

    if (!etfSymbol || !amount || !date) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const distributions = await readFile(DISTRIBUTIONS_FILE);
    const userDistributions = distributions[username] || [];
    const newItem = {
      id: Date.now().toString(),
      etfSymbol,
      amount: Number(amount),
      date,
    };
    userDistributions.push(newItem);
    distributions[username] = userDistributions;
    await writeFile(DISTRIBUTIONS_FILE, distributions);

    res.json({ message: "Distribution added successfully", data: newItem });
  } catch (error) {
    res.status(500).json({ error: "Failed to add distribution" });
  }
});

app.delete("/api/distributions/:username/:id", async (req, res) => {
  try {
    const { username, id } = req.params;
    const distributions = await readFile(DISTRIBUTIONS_FILE);
    const userDistributions = distributions[username] || [];
    distributions[username] = userDistributions.filter(
      (item) => item.id !== id
    );
    await writeFile(DISTRIBUTIONS_FILE, distributions);
    res.json({ message: `Deleted distribution ${id}` });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete distribution" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
