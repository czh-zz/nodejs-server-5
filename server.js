var http = require('http')
var fs = require('fs')
var url = require('url')
const { text, buffer } = require('stream/consumers')
var port = process.argv[2]

if (!port) {
    console.log('请指定端口号\n 例:node server.js 8888')
    process.exit(1)
}

var server = http.createServer(function (request, response) {
    var parsedUrl = url.parse(request.url, true)
    var pathWithQuery = request.url
    var queryString = ''
    if (pathWithQuery.indexOf('?') >= 0) { queryString = pathWithQuery.substring(pathWithQuery.indexOf('?')) }
    var path = parsedUrl.pathname
    var query = parsedUrl.query
    var method = request.method

    /******** 从这里开始看，上面不要看 ************/

    console.log('有新的请求发过来啦！路径（带查询参数）为：' + pathWithQuery)

    const session = JSON.parse(fs.readFileSync('./session.json'))
    if (path === '/home.html') {
        //请求Cookie
        const cookie = request.headers['cookie']
        let sessionId
        const homeHtml = fs.readFileSync('./public/home.html').toString()
        let string
        //在cooile中找到对应的user_id，在找到=后面的字符串
        try {
            sessionId = cookie.split(';')
                .filter(s => s.indexOf('session_id=') >= 0)[0]
                .split('=')[1]
        } catch (error) { }
        if (sessionId && session[sessionId]) {
            const userId = session[sessionId].user_id
            const userArray = JSON.parse(fs.readFileSync('./db/users.json'))
            const user = userArray.find(user => user.id === userId)
            // const homeHtml = fs.readFileSync('./public/home.html').toString()
            // let string
            if (user) {
                string = homeHtml.replace('{{loginStatus}}', '已登录')
                    .replace('{{user.name}}', user.name)
                response.write(string)
            } else { string = homeHtml.replace('{{loginStatus}}', '访问失败') }
        } else {
            string = homeHtml.replace('{{loginStatus}}', '用户未登录')
                .replace('{{user.name}}', '')
            response.write(string)
        }
        response.end()

    } else if (path === "/register" && method === 'POST') {
        response.setHeader('Content-Type', 'text/html;charset=utf-8')
        const userArray = JSON.parse(fs.readFileSync('./db/users.json'))
        const array = []
        request.on('data', (chunk) => {
            array.push(chunk)
        })
        request.on('end', () => {
            const string = Buffer.concat(array).toString()
            console.log(string)
            const obj = JSON.parse(string)
            const lastUser = userArray[userArray.length - 1]
            const newUser = {
                //id为最后一个用户的id+1
                id: lastUser ? lastUser.id + 1 : 1,
                name: obj.name,
                password: obj.password
            }
            userArray.push(newUser)
            fs.writeFileSync('./db/users.json', JSON.stringify(userArray))
            response.end()
        })

    } else if (path === "/sign_in" && method === 'POST') {
        response.setHeader('Content-Type', 'text/html;charset=utf-8')
        const userArray = JSON.parse(fs.readFileSync('./db/users.json'))
        const array = []
        request.on('data', (chunk) => {
            array.push(chunk)
        })
        request.on('end', () => {
            const string = Buffer.concat(array).toString()
            console.log(string)
            const obj = JSON.parse(string)
            const user = userArray.find((user) => user.name === obj.name && user.password === obj.password)
            if (user === undefined) {
                response.statusCode = 400
                response.setHeader('Content-Type', 'text/json;charset=utf-8')
                response.end(`{"errorCode":531}`)
            } else {
                response.Code = 200
                //发cookie 不准前端修改
                const random = Math.random()
                //const session = JSON.parse(fs.readFileSync('./session.json'))
                session[random] = { user_id: user.id }
                fs.writeFileSync('./session.json', JSON.stringify(session))
                response.setHeader("Set-Cookie", `session_id=${random};HttpOnly`)
                response.end()
            }
        })
    } else {
        response.statusCode = 200
        //默认首页
        const filePath = path === '/' ? '/index.html' : path
        const index = filePath.lastIndexOf('.')
        //suffix是后缀
        const suffix = filePath.substring(index)
        const fileTypes = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'text/javascript',
            '.png': 'image/png',
            '.jpg': 'image/jpeg'
        }
        let content
        try {
            content = fs.readFileSync(`./public${filePath}`)
        } catch (error) {
            content = '你访问的页面不存在'
            request.statusCode = 404
        }
        response.setHeader('Content-Type', `${fileTypes[suffix] || 'text/html'};charset=utf-8`)
        response.write(content)
        response.end()
    }

    /******** 代码结束，下面不要看 ************/
})

server.listen(port)
console.log('监听 ' + port + ' 成功\n请用Ctrl+鼠标左键点击打开 http://localhost:' + port)