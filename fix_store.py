import re

# Read the file
with open('public/store/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace all template literals in optionDescriptions with simple strings
# Find and replace problematic backtick strings

# Simple fix: replace all backtick strings with empty objects or simple strings
content = re.sub(
    r"optionDescriptions:\s*\{[^}]+(?:\{[^}]+\}[^}]+)*\}",
    "optionDescriptions: {}",
    content,
    flags=re.DOTALL
)

# Write back
with open('public/store/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed!")
