# Landing Manager JavaScript Issues Summary

## Problem
Landing Manager page at `/tools/landing-manager` has JavaScript syntax errors preventing the page from displaying landing pages list.

## Root Cause
The landing manager route uses a template literal (backticks) in `c.html(\`...\`)`. Inside this template literal, there's JavaScript code that builds HTML dynamically using string concatenation. The escaping of quotes in the onclick handlers is incorrect.

##Current Status
Multiple fix attempts made with different escaping strategies:
1. `\\\'` (3 backslashes) - causes "Invalid or unexpected token"
2. `\\'` (2 backslashes) - causes "Invalid or unexpected token"  
3. Switched to double quotes - causes "Unexpected identifier"

## Solution Needed
The HTML is built with:
```javascript
'<button onclick="generateQR(\'' + p.slug + '\')" ...>'
```

In a template literal context, this becomes complex. The best solution is to:
1. Use a different quote style in onclick  
2. Or use HTML entities
3. Or restructure to avoid nested escaping

## Next Steps
Try using &apos; HTML entity or restructure the JavaScript to avoid the complex escaping.

## Files Involved
- `/home/user/webapp/src/index.tsx` lines 21094-21500 (landing-manager route)
- Specifically lines 21255-21290 (loadPages function and HTML generation)

## Commits Made  
- 5945936: Fix JavaScript syntax errors in landing-manager QR alerts
- 9c2a2f6: Fix escape character in landing-manager safeUrl
- ff0a54e: Fix JavaScript escape sequences - Fix QR button onclick
- 730598b: Fix template literal escape sequences
- c8c02e5: Use JSON.stringify for safe URL escaping
- 741004d: Fix QR button HTML escaping

All attempts so far have not resolved the core issue.
