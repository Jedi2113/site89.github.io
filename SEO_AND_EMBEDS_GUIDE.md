# SEO & Social Media Meta Tags Guide

## 📋 Overview
This guide explains how to implement SEO optimization and unique Discord embeds for each page on Site-89.

## 🚀 Quick Start

### For the Homepage (index.html)
Add this in the `<head>` section, right after the viewport meta tag:
```html
<div w3-include-html="/components/seo-meta.html"></div>
```

### For Specific Pages
Replace `seo-meta.html` with the page-specific version:

- **Anomalies page:** `/components/seo-anomalies.html`
- **Personnel Files:** `/components/seo-personnel.html`
- **Guides:** `/components/seo-guides.html`

## 🎨 Creating Custom Page Embeds

For any page, copy `seo-meta.html` and customize these fields:

### Essential Fields:
1. **Title** - Shows as the main heading in Discord
   ```html
   <meta property="og:title" content="Your Page Title | SITE-89">
   ```

2. **Description** - Shows as the preview text
   ```html
   <meta property="og:description" content="Your compelling description here">
   ```

3. **Image** - The preview thumbnail (1200x630px recommended)
   ```html
   <meta property="og:image" content="https://site89.github.io/assets/img/your-image.png">
   ```

4. **URL** - The page's exact URL
   ```html
   <meta property="og:url" content="https://site89.github.io/your-page/">
   ```

## 🖼️ Creating Discord Embed Images

### Recommended Specs:
- **Size:** 1200x630 pixels
- **Format:** PNG or JPG
- **Location:** `/assets/img/`
- **Naming:** `og-[page-name].png`

### Image Ideas:
- Homepage: Site-89 logo with dramatic background
- Anomalies: SCP containment breach warning
- Personnel: Foundation ID card design
- Guides: Tutorial/handbook style graphic

### Where to Create Images:
- [Canva](https://canva.com) - Free templates
- [Figma](https://figma.com) - Design tool
- Photoshop/GIMP - Advanced editing

## 🔍 SEO Keywords Strategy

### Target Search Terms:
- "minecraft scp"
- "minecraft scp server"
- "scp roleplay server"
- "minecraft scp foundation"
- "scp roleplay minecraft"

### Keywords to Include:
```
Minecraft SCP, SCP Foundation, Minecraft roleplay, SCP roleplay, 
Site-89, SCP server, Foundation roleplay, anomaly containment
```

## 📊 Testing Your Meta Tags

### Discord Preview:
1. Send your URL in a Discord server
2. Wait for the embed to load
3. Delete and resend if it doesn't show

### Google Search Console:
1. Visit [Google Search Console](https://search.google.com/search-console)
2. Add your site
3. Submit your sitemap

### Meta Tag Validators:
- [Facebook Debugger](https://developers.facebook.com/tools/debug/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- [OpenGraph.xyz](https://www.opengraph.xyz/)

## 🗺️ Creating a Sitemap (for Google)

Create `sitemap.xml` in your root directory:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://site89.github.io/</loc>
    <lastmod>2026-01-07</lastmod>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://site89.github.io/anomalies/</loc>
    <lastmod>2026-01-07</lastmod>
    <priority>0.8</priority>
  </url>
  <!-- Add more pages -->
</urlset>
```

## 📝 Example Page Implementation

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- SEO & Social Media Meta Tags -->
  <div w3-include-html="/components/seo-anomalies.html"></div>
  
  <title>Anomaly Database | SITE-89</title>
  <!-- Rest of your head content -->
</head>
<body>
  <!-- Your page content -->
</body>
</html>
```

## 🎯 Priority Pages for Unique Embeds

1. **Homepage** (/) - Main site entry
2. **Anomalies** (/anomalies/) - SCP database
3. **Personnel Files** (/personnel-files/) - Characters
4. **Guides** (/guides/) - How to join
5. **Forum** (/forum/) - Community
6. **About** (/about/) - Server info
7. **Rules** (/rules/) - Server rules

## ⚡ Quick Tips

### For Discord:
- Use emojis in descriptions (⚠️ 🔒 📚)
- Keep descriptions under 200 characters
- Use eye-catching images
- Test the embed before sharing

### For Google:
- Use natural keyword phrases
- Update content regularly
- Include keywords in headings
- Make sure site loads fast
- Mobile-friendly design

### Cache Issues:
If Discord doesn't update your embed:
- Clear Discord's cache (Ctrl+R)
- Use a URL parameter: `?v=2`
- Wait 24 hours for cache to expire

## 📞 Need Help?

If embeds aren't showing:
1. Check your image URLs are absolute (include https://)
2. Verify images are publicly accessible
3. Use the validators above to test
4. Check console for errors

## 🔗 Additional Resources

- [Open Graph Protocol](https://ogp.me/)
- [Twitter Card Documentation](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
- [Google SEO Starter Guide](https://developers.google.com/search/docs/beginner/seo-starter-guide)
