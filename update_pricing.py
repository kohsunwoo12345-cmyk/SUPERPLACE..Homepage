#!/usr/bin/env python3
"""
Update pricing purchase pages with new pricing
"""

# Read the file
with open('src/index.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Update Basic Plan (₩77,000 → ₩143,000)
content = content.replace('₩77,000', '₩143,000')
content = content.replace('amount=77000', 'amount=143000')
content = content.replace('amount:77000', 'amount:143000')
content = content.replace('amount: 77000', 'amount: 143000')
content = content.replace('₩84,700', '₩157,300')  # Tax included
content = content.replace('amount: 84700', 'amount: 157300')

# Update Pro Plan (₩147,000 → ₩187,000)
content = content.replace('₩147,000', '₩187,000')
content = content.replace('amount=147000', 'amount=187000')
content = content.replace('amount:147000', 'amount:187000')
content = content.replace('amount: 147000', 'amount: 187000')
content = content.replace('₩161,700', '₩205,700')  # Tax included
content = content.replace('amount: 161700', 'amount: 205700')

# Update Premium Plan (₩440,000 → ₩330,000)
content = content.replace('₩440,000', '₩330,000')
content = content.replace('amount=440000', 'amount=330000')
content = content.replace('amount:440000', 'amount:330000')
content = content.replace('amount: 440000', 'amount: 330000')
content = content.replace('₩484,000', '₩363,000')  # Tax included
content = content.replace('amount: 484000', 'amount: 363000')

# Note: Enterprise (₩750,000) stays the same

# Write back
with open('src/index.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Pricing values updated successfully!")
print("Updated plans:")
print("  - Basic: ₩77,000 → ₩143,000")
print("  - Pro: ₩147,000 → ₩187,000")
print("  - Premium: ₩440,000 → ₩330,000")
print("  - Enterprise: ₩750,000 (unchanged)")
