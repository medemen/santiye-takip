@echo off
title Santiye Takip Sistemi
echo.
echo ========================================
echo    SANTIYE TAKIP SISTEMI
echo ========================================
echo.
echo   [1] Gelistirme Sunucusunu Baslat (npm run dev)
echo   [2] Projeyi Derle (npm run build)
echo   [3] Derlemeyi Onizle (npm run preview)
echo   [4] Bagimliliklari Yukle (npm install)
echo   [5] Cikis
echo.
echo ========================================
echo.

set /p secim="Seciminiz (1-5): "

if "%secim%"=="1" goto dev
if "%secim%"=="2" goto build
if "%secim%"=="3" goto preview
if "%secim%"=="4" goto install
if "%secim%"=="5" goto exit
goto error

:dev
echo.
echo Gelistirme sunucusu baslatiliyor...
echo Tarayicinizda http://localhost:5173 adresini acin.
echo.
call npm run dev
goto end

:build
echo.
echo Proje derleniyor...
echo.
call npm run build
echo.
echo Derleme tamamlandi. dist/ klasorunde.
pause
goto end

:preview
echo.
echo Derleme onizleniyor...
echo.
call npm run preview
goto end

:install
echo.
echo Bagimliliklari yukleniyor...
echo.
call npm install
echo.
echo Bagimliliklari yuklendi.
pause
goto end

:error
echo.
echo Gecersiz secim! Lutfen 1-5 arasi bir sayi girin.
echo.
pause
goto end

:exit
echo.
echo Cikiliyor...
timeout /t 1 /nobreak >nul
goto end

:end
