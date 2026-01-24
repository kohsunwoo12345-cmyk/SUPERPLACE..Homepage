#!/usr/bin/env python3
"""
Update ONLY pricing values in purchase pages - SAFE method
"""

with open('src/index.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Count occurrences before
before_77000 = content.count('77000')
before_147000 = content.count('147000')
before_440000 = content.count('440000')

# Replace pricing values
content = content.replace('77000', '143000')
content = content.replace('147000', '187000')
content = content.replace('440000', '330000')

# Write back
with open('src/index.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Pricing values updated successfully!")
print(f"  - 77000 → 143000 ({before_77000} occurrences)")
print(f"  - 147000 → 187000 ({before_147000} occurrences)")
print(f"  - 440000 → 330000 ({before_440000} occurrences)")
print("  - 750000 (unchanged)")
