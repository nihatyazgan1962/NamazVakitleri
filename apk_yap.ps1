$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Yellow
Write-Host "  NAMAZ VAKTIM APK OLUSTURUCU BASLADI  " -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Yellow

$jdkDir = "$PSScriptRoot\.jdk21"
if (-not (Test-Path "$jdkDir\jdk-21.0.4+7\bin\java.exe")) {
    Write-Host "[1/4] Java 21 (JDK) indiriliyor (Capacitor 6 Java 21 gerektiriyor)..." -ForegroundColor Cyan
    $jdkUrl = "https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.4%2B7/OpenJDK21U-jdk_x64_windows_hotspot_21.0.4_7.zip"
    $jdkZip = "$PSScriptRoot\jdk21.zip"
    Invoke-WebRequest -Uri $jdkUrl -OutFile $jdkZip
    
    Write-Host "      Java dosyalari cikariliyor..." -ForegroundColor Cyan
    Expand-Archive -Path $jdkZip -DestinationPath $jdkDir -Force
    Remove-Item $jdkZip
} else {
    Write-Host "[1/4] Java 21 hazir." -ForegroundColor Cyan
}

# Çevre Değişkenlerini Ayarla (Kurulu Android SDK ve yeni Java 21)
$env:JAVA_HOME = "$jdkDir\jdk-21.0.4+7"
$env:ANDROID_HOME = 'C:\Users\Nihat\Android\Sdk'
$env:NODE_ENV = 'production'
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:PATH"

Write-Host "[2/4] Vite projesi derleniyor..." -ForegroundColor Cyan
npx vite build
npx cap copy android

# local.properties dosyasını oluştur
$localProperties = "C:\Users\Nihat\Documents\Gemini\NamazVakitleri\android\local.properties"
$sdkDirEscaped = $env:ANDROID_HOME -replace '\\', '\\'
"sdk.dir=$sdkDirEscaped" | Out-File -FilePath $localProperties -Encoding ASCII

Write-Host "[3/4] APK derlemesi basliyor (Ilk derleme biraz surebilir)..." -ForegroundColor Cyan
Set-Location 'C:\Users\Nihat\Documents\Gemini\NamazVakitleri\android'
.\gradlew.bat assembleDebug --no-daemon -x lint 2>&1

Write-Host "[4/4] Build bitti. Exit code: $LASTEXITCODE" -ForegroundColor Yellow

if ($LASTEXITCODE -eq 0) {
    $apk = Get-ChildItem -Path '.\app\build\outputs\apk\debug\' -Filter '*.apk' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($apk) {
        Copy-Item $apk.FullName -Destination 'C:\Users\Nihat\Documents\Gemini\NamazVakitleri\NamazVaktim.apk' -Force
        Write-Host "`n=========================================" -ForegroundColor Green
        Write-Host "  BASARILI! NamazVaktim.apk olusturuldu  " -ForegroundColor Green
        Write-Host "=========================================`n" -ForegroundColor Green
    }
} else {
    Write-Host "`nHATA: Derleme basarisiz oldu." -ForegroundColor Red
}

Write-Host "Cikmak icin ENTER tusuna basin..." -ForegroundColor Yellow
Read-Host
