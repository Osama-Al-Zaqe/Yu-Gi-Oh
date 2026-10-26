#!/usr/bin/env bash
# ========================================================
# YuGi — موسوعة Yu-Gi-Oh! المتكاملة
# تشغيل الخادم المحلي على أنظمة Linux و macOS
# ========================================================

echo "========================================================"
echo "       YuGi — موسوعة Yu-Gi-Oh! المتكاملة"
echo "========================================================"
echo ""
echo "جارٍ التحقق من بيئة التشغيل..."

# Navigate to script directory
cd "$(dirname "$0")" || exit

if command -v python3 &>/dev/null; then
    echo "تم العثور على Python 3. جارٍ تشغيل الخادم المحلي..."
    python3 scripts/server.py
elif command -v python &>/dev/null; then
    echo "تم العثور على Python. جارٍ تشغيل الخادم المحلي..."
    python scripts/server.py
elif command -v node &>/dev/null; then
    echo "تم العثور على Node.js. جارٍ تشغيل الخادم..."
    node -e "const http=require('http'),fs=require('fs'),path=require('path');const mime={'.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json','.bmp':'image/bmp'};http.createServer((req,res)=>{let f=path.join(__dirname,decodeURIComponent(req.url.split('?')[0]));if(f.endsWith(path.sep))f=path.join(f,'index.html');fs.readFile(f,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream','Access-Control-Allow-Origin':'*'});res.end(data);});}).listen(8080,()=>{console.log('YuGi running at http://localhost:8080/index.html');});"
else
    echo "لم يتم العثور على Python أو Node.js. يرجى تثبيت أحدهما لتشغيل الخادم المحلي."
fi
