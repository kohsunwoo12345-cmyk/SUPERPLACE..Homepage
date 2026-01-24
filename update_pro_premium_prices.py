#!/usr/bin/env python3
"""
Update Pro and Premium plan prices
"""

with open('src/index.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Count occurrences before
before_187000 = content.count('187000')
before_330000 = content.count('330000')

# Replace pricing values
# Pro: 187000 → 275000
content = content.replace('187000', '275000')

# Premium: 330000 → 495000
content = content.replace('330000', '495000')

# Write back
with open('src/index.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Pricing values updated successfully!")
print(f"  - Pro: 187000 → 275000 ({before_187000} occurrences)")
print(f"  - Premium: 330000 → 495000 ({before_330000} occurrences)")
