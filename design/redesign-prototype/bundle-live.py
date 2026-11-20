# Bundles app.html + its CSS/JS + live/live-data.js + the logo into one file: live/app-live.html.
# Opens straight from disk. The live/ folder holds real members' data: local only, never committed.
import base64, pathlib
d = pathlib.Path(__file__).parent
html = (d/'app.html').read_text()
logo = 'data:image/png;base64,' + base64.b64encode((d/'live/logo.png').read_bytes()).decode()
data = (d/'live/live-data.js').read_text().replace('"live/logo.png"', '"' + logo + '"')
inline = lambda f: (d/f).read_text().replace('</script', '<\\/script')
html = html.replace('<link rel="stylesheet" href="app.css">', '<style>\n' + (d/'app.css').read_text() + '\n</style>')
html = html.replace('<script src="parts.js"></script>', '<script>\n' + inline('parts.js') + '\n</script>')
html = html.replace('<script src="live/live-data.js" onerror="void 0"></script>', '<script>\n' + data.replace('</script', '<\\/script') + '\n</script>')
img = lambda f, t: 'data:'+t+';base64,' + base64.b64encode((d/f).read_bytes()).decode()
about = (d/'live/about.js').read_text().replace("'live/banner-sm.jpg'", "'" + img('live/banner-sm.jpg','image/jpeg') + "'").replace("'live/share.jpg'", "'" + img('live/share.jpg','image/jpeg') + "'")
html = html.replace('<script src="live/about.js" onerror="void 0"></script>', '<script>\n' + about + '\n</script>')
html = html.replace('<script src="app.js"></script>', '<script>\n' + inline('app.js') + '\n</script>')
html = html.replace('<title>MyCoNet prototype</title>', '<title>MyCoNet prototype · Protopia live</title>')
(d/'live/app-live.html').write_text(html)
print('wrote live/app-live.html', len(html)//1024, 'KB')
