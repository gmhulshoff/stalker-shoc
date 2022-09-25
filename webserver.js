const http = require('http')
const fs = require('fs')
const path = require('path')
const url = require('url')
const port = 3000

http
  .createServer((req, res) => {
	const params = url.parse(req.url, true).query
	req.on('data', json => {
		const body = JSON.parse(json)
		if (req.url.startsWith('/readAllLtxSections')) 
			return res.end(readAllLtxSections(body))
		if (req.url.startsWith('/readJsonLtxSections')) 
			return res.end(readJsonLtxSections(body))
		if (req.url.startsWith('/readLtxSectionSetting')) 
			return res.end(readLtxSectionSetting(body))
		if (req.url.startsWith('/updateLtxSectionSetting')) 
			return res.end(updateLtxSectionSetting(body))
	})
    req.on('end', () => {})
    console.log(req.url.substr(1))
    const filePath = req.url == '/' ? './index.htm' : `.${req.url}`
    const extname = String(path.extname(filePath)).toLowerCase()
    fs.readFile(filePath, (error, content) => {
      if (!error) {
        res.writeHead(200, { 'Content-Type': getMimeTypes(extname) ?? 'application/octet-stream' })
        res.end(content, 'utf-8')
		return
	  }
      if (error?.code === 'ENOENT')
        fs.readFile('./404.html', (error, content) => {
          res.writeHead(404, { 'Content-Type': 'text/html' })
          res.end(content, 'utf-8')
        });
      res.writeHead(500);
      res.end(`Error: ${error.code} ..\n`)
    });
  })
  .listen(port)
console.log(`Server running at http://127.0.0.1:${port}/`)

function readAllLtxSections(params, content = readFile(params)) {
  const lines = content.split('\r\n')
  const sections = lines.slice(1).reduce((a,c) => {
    if (c.startsWith('[') && c.endsWith(']')) {
      a.current = c.substring(1, c.length - 1)
	  a[a.current] = {}
    }
    const kvp = c.split('=').map(kvp => kvp.trim())
	if (kvp.length == 2) a[a.current][kvp[0]] = kvp[1]
	return a
  }, {})
  delete sections.current
  return Object.keys(sections).filter(key => sections[key].type != 'storyline')
    .join('\r\n')
}

function readJsonLtxSections(params, content = readFile(params)) {
  const lines = content.split('\r\n')
  const sections = lines.slice(1).reduce((a,c) => {
    if (c.startsWith('[') && c.endsWith(']')) {
      a.current = c.substring(1, c.length - 1)
	  a[a.current] = {}
    }
    const kvp = c.split('=').map(kvp => kvp.trim())
	if (kvp.length == 2) a[a.current][kvp[0]] = kvp[1]
	return a
  }, {})
  delete sections.current
  return JSON.stringify(sections)
}

function readLtxSectionSetting(params, content = readFile(params)) {
  const sectionSrc = `.*\\[${params.section}\\](?<${params.section}>[\\s\\S]*)(\\[|$)`
  const match = content.match(new RegExp(sectionSrc))
  const section = match.groups[params.section]
  const texts = params.texts ? fs.readFileSync(`${params.path}/${params.texts}`).toString() : ''
  return params.setting.split(',').map(setting => {
    const val = section.match(new RegExp(`${setting}\\s*?=(\\s)(?<${setting}>.*?\\r\\n)\\s*?`))
	  ?.groups[setting].trim()
	if (texts && ['description','text'].includes(setting)) 
      return readText(val, texts)?.split(',').join('').split('\n').join(' ')
	return val
  }).join('\r\n')
}

function updateLtxSectionSetting(params, content = readFile(params)) {
  const regexp = new RegExp(`${params.setting}\t\t=.*?${params.oldValue}`)
  const newLine = `${params.setting}\t\t= ${params.newValue}`
  writeFile(params, content.replace(regexp, newLine))
  return `Updated ${params.path}/${params.fileName} with ${newLine}`
}

function readText(id, content) {
  const all = '[\\s\\S]*?'
  const src = `<string id="${id}">${all}<text>(?<${id}>${all})<\/text>${all}<\/string>`
  return content.match(new RegExp(src))?.groups[id]
}

function readFile(params) { return fs.readFileSync(`${params.path}/${params.fileName}`).toString() }
function writeFile(params, content) { return fs.writeFileSync(`${params.path}/${params.fileName}`, content) }

function getMimeTypes(extName) {
	return {
      '.htm': 'text/html',
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.wav': 'audio/wav',
      '.mp4': 'video/mp4',
      '.woff': 'application/font-woff',
      '.ttf': 'application/font-ttf',
      '.eot': 'application/vnd.ms-fontobject',
      '.otf': 'application/font-otf',
      '.wasm': 'application/wasm',
    }[extName]
}