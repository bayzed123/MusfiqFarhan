<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title>XML Sitemap | Musfiq R. Farhan Official</title>
        <style>
          :root { color-scheme: dark; font-family: system-ui, sans-serif; background: #08090c; color: #f4f5f7; }
          body { margin: 0; padding: 2rem; }
          main { max-width: 1100px; margin: auto; }
          h1 { font-size: 1.5rem; }
          p { color: #b6bac4; }
          table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; background: #101218; }
          th, td { text-align: left; padding: .75rem 1rem; border-bottom: 1px solid rgba(255,255,255,.1); }
          th { color: #ff3b4e; font-size: .75rem; letter-spacing: .08em; text-transform: uppercase; }
          a { color: #f4f5f7; word-break: break-word; }
          code { color: #9de7bd; }
        </style>
      </head>
      <body>
        <main>
          <h1>Musfiq R. Farhan Official sitemap</h1>
          <p>This XML sitemap is generated automatically. Search engines read the XML directly; this view is only a human-readable presentation.</p>
          <table>
            <thead><tr><th>URL</th><th>Last modified</th><th>Priority</th></tr></thead>
            <tbody>
              <xsl:for-each select="//*[local-name()='url']">
                <tr>
                  <td><a href="{*[local-name()='loc']}"><xsl:value-of select="*[local-name()='loc']"/></a></td>
                  <td><code><xsl:value-of select="*[local-name()='lastmod']"/></code></td>
                  <td><xsl:value-of select="*[local-name()='priority']"/></td>
                </tr>
              </xsl:for-each>
            </tbody>
          </table>
        </main>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
