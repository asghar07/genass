# Basic Usage Example

## Quick Start - Generate a Logo

```bash
# Start GenAss
genass

# First time setup
Your app: It's a mobile fitness tracking app

# Generate a logo
genass> /logo

📋 Tasks:
  ⠿ Analyzing app purpose and brand
  ○ Designing logo concept
  ○ Generating primary logo
  ○ Creating icon variant

✔ Generated: app-logo.png
✔ Assets moved to public/assets/logos/

# Get code to use it
genass> /inject

📝 Example Code Snippets:

   app-logo:
   import appLogo from '@/public/assets/logos/app-logo.png';
   <img src={appLogo} alt="app logo" />

# Done! Copy the code into your component
```

## Full Workflow - Complete Branding

```bash
genass

Your app: E-commerce store for handmade jewelry

genass> /branding

# GenAss will:
# 1. Generate primary logo
# 2. Generate logo icon variant
# 3. Generate favicon set (4 sizes)
# 4. Generate social media images (OG, Twitter)
# 5. Generate hero banner
# 6. Generate UI icons

✔ Generated 12 assets
💰 Total cost: $0.47

genass> /inject

# Shows import statements for all 12 assets

genass> /exit
```

## Using Natural Language

```bash
genass> I need a minimalist logo with a blue and white color scheme

GenAss: I'll create a minimalist logo with blue and white colors...
⚡ Executing: generateAssets(...)
✔ Generated: app-logo.png

genass> Can you also make some icons for navigation?

GenAss: Sure! I'll generate navigation icons...
⚡ Executing: generateAssets(...)
✔ Generated 5 navigation icons

genass> What else do I need?

GenAss: Based on your e-commerce store, I recommend:
- Product placeholder images
- Category banner images
- Shopping cart icon
- Wishlist icon
...

Would you like me to generate these?

genass> yes, generate them

⚡ Executing: generateAssets(...)
✔ Generated 8 additional assets
```

## Command Mode (Non-Interactive)

```bash
# Traditional CLI mode for scripts/automation
genass init
genass generate --type logo --priority high
genass status
```

## Pro Tips

1. **Start with /scan** to see what you need
2. **Use /quick** for MVP launches (just essentials)
3. **Edit AGENTS.md** to update app context
4. **Use /regenerate** if you want fresh designs
5. **Run /inject** to get code snippets
6. **Check /status** to see costs and usage