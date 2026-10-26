@echo off
chcp 65001 >nul
title YuGi — موسوعة Yu-Gi-Oh! المتكاملة

:: Ensure working directory is always the script directory
cd /d "%~dp0"
cls

echo ========================================================
echo        YuGi — موسوعة Yu-Gi-Oh! المتكاملة
echo ========================================================
echo.
echo جارٍ التحقق من بيئة التشغيل المحلية...

:: Check for py launcher
where py >nul 2>nul
if %errorlevel% equ 0 (
    echo تم العثور على مشغل Python ^(py^). جارٍ تشغيل الخادم المحلي...
    py scripts\server.py
    goto end
)

:: Check for python
where python >nul 2>nul
if %errorlevel% equ 0 (
    echo تم العثور على Python. جارٍ تشغيل الخادم المحلي...
    python scripts\server.py
    goto end
)

:: Check for node
where node >nul 2>nul
if %errorlevel% equ 0 (
    echo تم العثور على Node.js. جارٍ تشغيل الخادم المحلي عبر Node...
    node -e "const http=require('http'),fs=require('fs'),path=require('path'),{exec}=require('child_process');const mime={'.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json','.bmp':'image/bmp'};http.createServer((req,res)=>{let f=path.join(__dirname,decodeURIComponent(req.url.split('?')[0]));if(f.endsWith(path.sep))f=path.join(f,'index.html');fs.readFile(f,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream','Access-Control-Allow-Origin':'*'});res.end(data);});}).listen(8080,()=>{console.log('YuGi running at http://localhost:8080/index.html');exec('start http://localhost:8080/index.html');});"
    goto end
)

echo.
echo [تنبيه] لم يتم العثور على Python أو Node.js مثبتين في مسار النظام.
echo جارٍ فتح الموقع مباشرة في المتصفح...
start index.html
echo ملاحظة: يُفضل استخدام Python لتجاوز قيود متصفحات Chrome/Edge في قراءة ملفات JSON المحلية.

:end
pause
