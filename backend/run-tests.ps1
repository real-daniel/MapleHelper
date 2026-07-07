$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$jdkHome = "C:\Program Files\Eclipse Adoptium\jdk-21.0.7.6-hotspot"
$mavenHome = Join-Path $repoRoot ".tools\apache-maven-3.9.16"

if (-not (Test-Path $jdkHome)) {
    throw "JDK 21 was not found at $jdkHome"
}

if (-not (Test-Path $mavenHome)) {
    throw "Maven was not found at $mavenHome"
}

$env:JAVA_HOME = $jdkHome
$env:Path = "$env:JAVA_HOME\bin;$mavenHome\bin;$env:Path"

Push-Location $PSScriptRoot
try {
    mvn test
}
finally {
    Pop-Location
}
