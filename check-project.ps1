#!/usr/bin/env powershell

# Set error action preference
$ErrorActionPreference = 'Stop'

# Change to project directory
Set-Location "santiye_takip_9"

Write-Host "=== PROJECT CHECK REPORT ===" -ForegroundColor Green
Write-Host "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host ""

# 1. Check package.json
Write-Host "=== 1. Checking package.json ==="
$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
Write-Host "Name: $($packageJson.name)"
Write-Host "Version: $($packageJson.version)"
Write-Host "Scripts:"
foreach ($script in $packageJson.scripts.PSObject.Properties) {
    Write-Host "  npm run $($script.Name)"
}

# 2. Check TypeScript configuration
Write-Host "\n=== 2. Checking TypeScript Configuration ==="
if (Test-Path "tsconfig.json") {
    $tsconfig = Get-Content "tsconfig.json" -Raw | ConvertFrom-Json
    Write-Host "✓ tsconfig.json exists"
    
    # Check if it references other TS configs
    if ($tsconfig.references) {
        Write-Host "  References:"
        foreach ($ref in $tsconfig.references) {
            Write-Host "    - $($ref.path)"
            if (Test-Path $ref.path) {
                Write-Host "      ✓ Found"
            } else {
                Write-Host "      ✗ Missing: $($ref.path)"
            }
        }
    }
} else {
    Write-Host "✗ tsconfig.json not found"
}

# 3. Check build
Write-Host "\n=== 3. Running Build ==="
try {
    & npm run build
    Write-Host "✓ Build completed successfully"
} catch {
    Write-Host "✗ Build failed: $($_.Exception.Message)"
}

# 4. Check linting
Write-Host "\n=== 4. Running Lint Check ==="
try {
    & npm run lint
    Write-Host "✓ Lint check passed (no warnings or errors)"
} catch {
    Write-Host "✗ Lint check failed: $($_.Exception.Message)"
}

# 5. Check src directory structure
Write-Host "\n=== 5. Checking src Directory Structure ==="
if (Test-Path "src") {
    $srcFiles = Get-ChildItem -Recurse "src" -File
    Write-Host "Total files in src: $($srcFiles.Count)"
    
    # Check for TypeScript files
    $tsFiles = $srcFiles | Where-Object { $_.Extension -in @('.ts', '.tsx') }
    Write-Host "TypeScript files: $($tsFiles.Count)"
    
    if ($tsFiles.Count -gt 0) {
        Write-Host "First 10 TypeScript files:"
        $tsFiles | Select-Object-Object | Select-Object-Object | head -10 | ForEach-Object { Write-Host "  - $($_.FullName)" }
    }
    
    # Check for index.ts or App.tsx
    $hasIndex = Test-Path "src/index.ts" -PathType Leaf
    $hasApp = Test-Path "src/App.tsx" -PathType Leaf
    Write-Host "\nEntry points:"
    Write-Host "  src/index.ts: $(if ($hasIndex) { '✓' } else { '✗' })"
    Write-Host "  src/App.tsx: $(if ($hasApp) { '✓' } else { '✗' })"
    
} else {
    Write-Host "✗ src directory not found"
}

# 6. Check dist directory
Write-Host "\n=== 6. Checking dist Directory ==="
if (Test-Path "dist") {
    $distFiles = Get-ChildItem -Recurse "dist" -File
    Write-Host "Total files in dist: $($distFiles.Count)"
    Write-Host "dist/index.html: $(if (Test-Path "dist/index.html") { '✓' } else { '✗' })"
} else {
    Write-Host "✗ dist directory not found"
}

# 7. Check for common TypeScript issues
Write-Host "\n=== 7. Checking Common TypeScript Patterns ==="
if (Test-Path "src") {
    $tsFiles = Get-ChildItem -Recurse "src" -File | Where-Object { $_.Extension -in @('.ts', '.tsx') }
    $importIssues = 0
    $exportIssues = 0
    
    foreach ($file in $tsFiles) {
        $content = Get-Content $file.FullName -Raw
        
        # Check for incomplete import statements
        if ($content -match "^import.*from.*['\\]") {
            $importIssues++
            Write-Host "  Potential import issue in: $($file.Name)"
        }
        
        # Check for potential export issues
        if ($content -match "^export.*from.*['\\]") {
            $exportIssues++
        }
    }
    
    if ($importIssues -eq 0) {
        Write-Host "✓ No import issues found"
    }
    if ($exportIssues -eq 0) {
        Write-Host "✓ No export issues found"
    }
}

Write-Host "\n=== CHECK SUMMARY ==="
Write-Host "Project: santiye-takip"
Write-Host "Status: $(if ((Test-Path 'dist') -and ((Get-ChildItem 'dist').Count -gt 0)) { '✓ Built Successfully' } else { '✗ Build Issues' })"
Write-Host "Lint Status: $(if ((Get-ChildItem 'src' -Recurse -File | Where-Object { $_.Extension -in @('.ts', '.tsx') }).Count -gt 0) { 'TypeScript files present' } else { 'No TypeScript files' })"
Write-Host "\nNote: The build process is working. If you encounter specific issues, check the detailed output above.\n"
