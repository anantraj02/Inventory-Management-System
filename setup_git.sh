#!/bin/bash
# Check if git is installed
if ! command -v git &> /dev/null
then
    echo "❌ Git is not installed. Please install Git on your Mac first."
    exit 1
fi

echo "🚀 Initializing local Git repository..."
git init

# Add all files to staging
echo "📦 Adding files to repository..."
git add .

# Create the initial commit
echo "💾 Creating initial commit..."
git commit -m "Initial commit: Vortex ERP configured for cloud deployment"

echo "✅ Git repository initialized locally!"
echo ""
echo "--------------------------------------------------------"
echo "👉 NEXT STEPS:"
echo "1. Go to https://github.com and log in."
echo "2. Click 'New Repository' (or go to https://github.com/new)."
echo "3. Name it 'vortex-erp' and keep it Public or Private."
echo "4. Do NOT check any options like 'Add a README' or '.gitignore'."
echo "5. Copy the command under '...or push an existing repository from the command line'."
echo "   It will look like this:"
echo "     git remote add origin https://github.com/YOUR_USERNAME/vortex-erp.git"
echo "     git branch -M main"
echo "     git push -u origin main"
echo "6. Run those commands in your terminal to upload the code."
echo "--------------------------------------------------------"
