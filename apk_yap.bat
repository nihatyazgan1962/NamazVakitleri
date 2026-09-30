@echo off
color 0A
title Namaz Vaktim APK Olusturucu
echo Lutfen bekleyin, APK olusturucu baslatiliyor...
powershell -ExecutionPolicy Bypass -File "%~dp0apk_yap.ps1"
