@echo off
title Santiye Takip - Dev Server
cd /d "%~dp0"

cls
echo ========================================
echo     SANTIYE TAKIP SISTEMI
echo     Construction Site Tracking
echo ========================================
echo.
echo Baslangic tarihi: %date% %time%
echo.

:: Node.js kontrol
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [HATA] Node.js bulunamadi! Lutfen Node.js yukleyin.
    echo.
    pause
    exit /b 1
)

:: node_modules kontrol
if not exist "node_modules\" (
    echo [1/3] Bagimliliklar yukleniyor...
    call npm install
    if %errorlevel% neq 0 (
        echo [HATA] npm install basarisiz oldu.
        pause
        exit /b 1
    )
    echo [OK] Bagimliliklar yuklendi.
) else (
    echo [OK] Bagimliliklar mevcut.
)

:: data klasoru kontrol
if not exist "data\" (
    mkdir data
    echo [OK] data/ klasoru olusturuldu.
)

:: .env dosyasi kontrol
if not exist ".env" (
    echo NEXT_PUBLIC_APP_NAME=Santiye Takip > .env
    echo [OK] .env dosyasi olusturuldu.
)

echo.
echo ========================================
echo  Sunucu baslatiliyor...
echo  URL: http://localhost:3000
echo ========================================
echo.

:: Eski sunucu proseslerini temizle
taskkill /fi "WINDOWTITLE eq SantiyeServer*" /f >nul 2>&1

start "SantiyeServer" cmd /c "npm run dev"

echo.
echo ------------------------------
echo  [1] Tarayicida ac
echo  [2] Yeniden baslat
echo  [Q] Cikis
echo ------------------------------
echo.

:menu
choice /c 12Q /n /m "Secenek (1/2/Q): "

if errorlevel 3 goto quit
if errorlevel 2 goto restart
if errorlevel 1 goto browser

:browser
echo.
echo Tarayici aciliyor...
start http://localhost:3000
echo.
goto menu

:restart
echo.
echo [%date% %time%] Sunucu yeniden baslatiliyor...
taskkill /fi "WINDOWTITLE eq SantiyeServer*" /f >nul 2>&1
timeout /t 2 /nobreak >nul
cls
echo ========================================
echo     SANTIYE TAKIP SISTEMI
echo ========================================
echo.
start "SantiyeServer" cmd /c "npm run dev"
echo Sunucu yeniden baslatildi.
echo.
goto menu

:quit
echo.
echo [%date% %time%] Sunucu durduruluyor...
taskkill /fi "WINDOWTITLE eq SantiyeServer*" /f >nul 2>&1
timeout /t 1 /nobreak >nul
echo Cikis yapildi.
exit
