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
		if (req.url.startsWith('/readLtxSetting')) 
			return res.end(readLtxSetting(body))
		if (req.url.startsWith('/readAllLtxSections')) 
			return res.end(readAllLtxSections(body))
		if (req.url.startsWith('/readLtxSectionSetting')) 
			return res.end(readLtxSectionSetting(body))
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

function readLtxSetting(params, content = readFile(params)) {
  const src = `.*${params.setting}\\s*?=(\\s)(?<${params.setting}>\\S*)\\s*?`
  return content.match(new RegExp(src)).groups[params.setting]
}

function readAllLtxSections(params, content = readFile(params)) {
  const lines = content.split('\r\n')
  console.log(lines.length)
  const sections = []
  return lines
    .filter(line => line.startsWith('[') && line.endsWith(']'))
	.map(line => line.substring(1, line.length - 1))
	.slice(1)
	.join('\r\n')
}

function readLtxSectionSetting(params, content = readFile(params)) {
  const sectionSrc = `.*\\[${params.section}\\](?<${params.section}>[\\s\\S]*)(\\[|$)`
  const match = content.match(new RegExp(sectionSrc))
  const section = match.groups[params.section]
  const texts = fs.readFileSync(`${params.path}/${params.texts}`).toString()
  return params.setting.split(',').map(setting => {
    const val = section.match(new RegExp(`.*${setting}\\s*?=(\\s)(?<${setting}>.*?\\r\\n)\\s*?`)).groups[setting].trim()
	if (['description','text'].includes(setting)) return readText(val, texts)?.split(',').join('').split('\n').join(' ')
	return val
  }).join('\r\n')
}

function readText(id, content) {
  const all = '[\\s\\S]*?'
  const src = `<string id="${id}">${all}<text>(?<${id}>${all})<\/text>${all}<\/string>`
  return content.match(new RegExp(src))?.groups[id]
}

function readFile(params) {
  return fs.readFileSync(`${params.path}/${params.fileName}`).toString()
}

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