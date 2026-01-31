#!/usr/bin/env python3
import re

# Read the backup
with open('App.tsx.backup', 'r') as f:
    content = f.read()

# Replace HeroProps with HomePageProps
content = content.replace('type HeroProps', 'type HomePageProps')
content = content.replace('export const Hero:', 'export const HomePage:')
content = content.replace('React.FC<HeroProps>', 'React.FC<HomePageProps>')

# Find and remove the old hero section HTML (from <Hero /> to just before <ShopByCategory>)
# Use regex to find the section
pattern = r'(<Hero />)\s*<div className="w_KPWk w_GxNv">.*?</section>\s*(?=<ShopByCategory)'
content = re.sub(pattern, r'\1\n\n      ', content, flags=re.DOTALL)

# Remove commented slider props
lines = content.split('\n')
cleaned_lines = []
skip_comment_block = False

for i, line in enumerate(lines):
    if '* Slider props (kept for later, currently unused)' in line:
        skip_comment_block = True
    elif skip_comment_block and '*/' in line:
        skip_comment_block = False
        continue
    elif skip_comment_block and ('//' in line or '*' in line):
        continue
    else:
        cleaned_lines.append(line)

content = '\n'.join(cleaned_lines)

# Write back
with open('App.tsx', 'w') as f:
    f.write(content)

print("Successfully updated App.tsx")
