param(
    [string]$SourcePath
)

$ErrorActionPreference = 'Stop'
$sourceUrl = 'https://ftp.imcce.fr/pub/ephem/planets/vsop87/VSOP87D.ear'
$expectedSha256 = '8B160C859136D467F2BE7FC29EFA8A9652E95516DFBDE00E4C739D7DDC90CA91'
$limits = @{
    1 = @(64, 34, 20, 7, 3, 1)
    3 = @(40, 10, 6, 2, 1, 0)
}

$temporaryDownload = $false
if (-not $SourcePath) {
    $SourcePath = Join-Path ([IO.Path]::GetTempPath()) 'VSOP87D.ear'
    Invoke-WebRequest -Uri $sourceUrl -OutFile $SourcePath -UseBasicParsing
    $temporaryDownload = $true
}

try {
    $actualHash = (Get-FileHash -LiteralPath $SourcePath -Algorithm SHA256).Hash
    if ($actualHash -ne $expectedSha256) {
        throw "Unexpected VSOP87D.ear SHA-256: $actualHash"
    }

    $series = @{ 1 = @(); 3 = @() }
    foreach ($variable in @(1, 3)) {
        for ($power = 0; $power -lt 6; $power++) {
            $series[$variable] += ,([Collections.Generic.List[string]]::new())
        }
    }

    $currentVariable = -1
    $currentPower = -1
    foreach ($line in Get-Content -LiteralPath $SourcePath) {
        if ($line -match '^ VSOP87 VERSION.*VARIABLE\s+(\d).*\*T\*\*(\d)') {
            $currentVariable = [int]$Matches[1]
            $currentPower = [int]$Matches[2]
            continue
        }
        if (-not $series.ContainsKey($currentVariable) -or $currentPower -gt 5) {
            continue
        }
        $limit = $limits[$currentVariable][$currentPower]
        $target = $series[$currentVariable][$currentPower]
        if ($target.Count -ge $limit * 3) {
            continue
        }
        $parts = $line.Trim() -split '\s+'
        if ($parts.Count -lt 3) {
            continue
        }
        $target.AddRange([string[]]@($parts[-3], $parts[-2], $parts[-1]))
    }

    function Format-Java-Series([Collections.Generic.List[string]]$values) {
        return '            {' + ($values -join ', ') + '}'
    }

    function Format-Java-Variable([int]$variable) {
        $powers = foreach ($values in $series[$variable]) {
            Format-Java-Series $values
        }
        return $powers -join ",`n"
    }

    function Format-JavaScript-Variable([int]$variable) {
        $powers = foreach ($values in $series[$variable]) {
            '  [' + ($values -join ', ') + ']'
        }
        return $powers -join ",`n"
    }

    $java = @"
package cn.wannianli.calendar.astronomy;

/**
 * Generated truncated VSOP87D Earth series from the official IMCCE distribution.
 * Source SHA-256: $expectedSha256
 */
final class EarthVsop87 {

    private static final double[][] LONGITUDE = {
$(Format-Java-Variable 1)
    };

    private static final double[][] RADIUS = {
$(Format-Java-Variable 3)
    };

    private EarthVsop87() {
    }

    static double longitude(double julianEphemerisDay) {
        return evaluate(LONGITUDE, julianEphemerisDay);
    }

    static double radius(double julianEphemerisDay) {
        return evaluate(RADIUS, julianEphemerisDay);
    }

    private static double evaluate(double[][] series, double julianEphemerisDay) {
        double tau = (julianEphemerisDay - 2_451_545.0) / 365_250.0;
        double tauPower = 1.0;
        double result = 0.0;
        for (double[] terms : series) {
            double sum = 0.0;
            for (int i = 0; i < terms.length; i += 3) {
                sum += terms[i] * Math.cos(terms[i + 1] + terms[i + 2] * tau);
            }
            result += sum * tauPower;
            tauPower *= tau;
        }
        return result;
    }
}
"@

    $javascript = @"
// Generated truncated VSOP87D Earth series from the official IMCCE distribution.
// Source SHA-256: $expectedSha256
export const EARTH_LONGITUDE = [
$(Format-JavaScript-Variable 1)
];

export const EARTH_RADIUS = [
$(Format-JavaScript-Variable 3)
];
"@

    $root = Split-Path $PSScriptRoot -Parent
    $utf8 = [Text.UTF8Encoding]::new($false)
    [IO.File]::WriteAllText(
        (Join-Path $root 'src/main/java/cn/wannianli/calendar/astronomy/EarthVsop87.java'),
        $java,
        $utf8)
    [IO.File]::WriteAllText((Join-Path $root 'worker/src/vsop87.js'), $javascript, $utf8)
} finally {
    if ($temporaryDownload) {
        Remove-Item -LiteralPath $SourcePath -Force -ErrorAction SilentlyContinue
    }
}
