# Complete Setup Guide

Step-by-step guide to get GenAss running.

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- Google Cloud account (free tier works!)

## Step 1: Install GenAss

```bash
# Global installation
npm install -g genass

# Or use npx (no installation needed)
npx genass
```

## Step 2: Get Google Gemini API Key

### Using Google Cloud Console (Recommended)

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create or Select Project**
   - Click project dropdown at top
   - Click "NEW PROJECT"
   - Name it (e.g., "genass-project")
   - Click "CREATE"

3. **Enable Generative Language API**
   - Go to "APIs & Services" → "Library"
   - Search for "Generative Language API"
   - Click on it
   - Click "ENABLE"

4. **Create API Key**
   - Go to "APIs & Services" → "Credentials"
   - Click "+ CREATE CREDENTIALS"
   - Select "API Key"
   - Copy the generated API key
   - (Optional) Click "RESTRICT KEY" to limit usage

5. **Restrict API Key (Recommended)**
   - Click on your API key to edit
   - Under "API restrictions"
   - Select "Restrict key"
   - Choose "Generative Language API"
   - Click "SAVE"

## Step 3: Configure GenAss

### Option 1: Environment Variable (Temporary)

```bash
export GEMINI_API_KEY=your_api_key_here
genass
```

### Option 2: .env File (Recommended)

```bash
# Create .env file in your project
echo "GEMINI_API_KEY=your_api_key_here" > .env

# Or copy the example
cp node_modules/genass/.env.example .env

# Edit .env with your real key
vim .env
```

### Option 3: Global Config (Permanent)

```bash
# Create global config
mkdir -p ~/.genass
echo '{"geminiApiKey": "your_api_key_here"}' > ~/.genass/config.json
```

## Step 4: Verify Setup

```bash
# Run GenAss
genass

# You should see:
# ✅ GEMINI_API_KEY: SET
# ✅ Environment validation passed!
```

## Step 5: First Run

```bash
genass

# Answer the onboarding question:
Your app: [Describe your app]

# Try a command:
genass> /help
genass> /scan
```

## Troubleshooting

### "GEMINI_API_KEY not found"

Make sure you've set the API key:
```bash
echo $GEMINI_API_KEY
# Should show your key
```

If empty, set it:
```bash
export GEMINI_API_KEY=your_key_here
```

### "API key invalid"

- Check the key is from Google Cloud Console → Credentials
- Ensure Generative Language API is enabled
- Verify no extra spaces in .env file
- Try regenerating the API key

### "Permission denied"

Enable the API:
```bash
# Go to: console.cloud.google.com
# → APIs & Services → Library
# → Search "Generative Language API"
# → Click ENABLE
```

### "Rate limit exceeded"

Free tier limits:
- 15 requests per minute
- 1,500 requests per day

GenAss handles this automatically with delays, but you may need to wait.

## Cost Management

Set a budget limit:

```bash
# In .env file
MONTHLY_BUDGET_LIMIT=10.0
```

Check spending:
```bash
genass> /costs
```

## Tips

1. **Start with /scan** to see what you need
2. **Use /quick** for fast MVP launches
3. **Check /costs** regularly
4. **Edit AGENTS.md** to update app context
5. **Use /help** to see all commands

## Next Steps

- Read [User Guide](USER_GUIDE.md)
- Check [API Documentation](API.md)
- Try the examples in [examples/](examples/)
- Star the repo: https://github.com/asghar07/genass

## Support

- Discord Community: https://discord.gg/genass
- GitHub Issues: https://github.com/asghar07/genass/issues
- npm Package: https://www.npmjs.com/package/genass
- Email: asghar.07@gmail.com

Happy generating! 🎨