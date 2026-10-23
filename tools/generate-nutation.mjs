import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

// Pinned upstream source; the generated implementations only evaluate longitude.
const commit = "ec968fb295d3cf0572c4f024bf3c5357d9258b7b";
const sourceUrl = `https://raw.githubusercontent.com/liberfa/erfa/${commit}/src/nut80.c`;
const source = process.argv[2] ? await readFile(process.argv[2], "utf8") : await (await fetch(sourceUrl)).text();
const sha = createHash("sha256").update(source).digest("hex");
assert.equal(sha, "08c6fda7949eaa04c64c38e52e62183f32bbbe89c1ab2ece564c545c01532ae7", "Pinned ERFA source hash changed");
const table = [...source.slice(source.indexOf("} x[] = {"), source.indexOf("/* Number of terms"))
  .matchAll(/\{([^{}]+)\}/gu)].map(match => match[1].split(",").map(Number));
assert.equal(table.length, 106);
assert.ok(table.every(row => row.length === 9 && row.every(Number.isFinite)));
const license = source.slice(source.lastIndexOf("/*----------------------------------------------------------------------"))
  .replace(/^\/\*[^\n]*\n/u, "").replace(/\*\/\s*$/u, "").split("\n").map(line => line.replace(/^\*\* ?/u, "").trimEnd()).join("\n").trim();
assert.ok(license.includes("Copyright (C) 2013-2023, NumFOCUS Foundation."));
const header = `Generated from ERFA nut80.c (${commit}).\n * ${sourceUrl}\n * Source SHA-256: ${sha}\n * Longitude-only port of the complete 106-term IAU 1980 series.\n *\n * ${license.split("\n").join("\n * ")}`.replace(/[ \t]+$/gmu, "");
const argumentsTable = [[485866.733,715922.633,31.310,.064,1325],
  [1287099.804,1292581.224,-.577,-.012,99], [335778.877,295263.137,-13.257,.011,1342],
  [1072261.307,1105601.328,-6.891,.019,1236], [450160.280,-482890.539,7.455,.008,-5]];
const javaTable = values => values.map(row => `        {${row.join(", ")}}`).join(",\n");
await writeFile(new URL("../src/main/java/cn/wannianli/calendar/astronomy/Nutation1980.java", import.meta.url),
`package cn.wannianli.calendar.astronomy;

/** ${header} */
public final class Nutation1980 {
    private static final double[][] ARGUMENTS = {
${javaTable(argumentsTable)}
    };
    private static final double[][] TERMS = {
${javaTable(table.map(row => row.slice(0, 7)))}
    };
    private Nutation1980() { }

    public static double longitudeDegrees(double julianEphemerisDay) {
        double t = (julianEphemerisDay - 2_451_545.0) / 36_525.0;
        double[] arguments = new double[5];
        for (int i = 0; i < arguments.length; i++) {
            double[] c = ARGUMENTS[i];
            double angle = (c[0] + (c[1] + (c[2] + c[3] * t) * t) * t) * Math.PI / (180 * 3600)
                    + (c[4] * t % 1) * (2 * Math.PI);
            angle %= 2 * Math.PI;
            if (Math.abs(angle) >= Math.PI) angle -= Math.copySign(2 * Math.PI, angle);
            arguments[i] = angle;
        }
        double sum = 0;
        for (int i = TERMS.length - 1; i >= 0; i--) {
            double[] term = TERMS[i];
            double argument = 0;
            for (int j = 0; j < arguments.length; j++) argument += term[j] * arguments[j];
            sum += (term[5] + term[6] * t) * Math.sin(argument);
        }
        return sum / 10_000 / 3_600;
    }
}
`);
await writeFile(new URL("../worker/src/nutation.js", import.meta.url),
`/*! ${header} */
const ARGUMENTS = ${JSON.stringify(argumentsTable)};
const TERMS = ${JSON.stringify(table.map(row => row.slice(0, 7)))};

export function nutationLongitudeDegrees(julianEphemerisDay) {
  const t = (julianEphemerisDay - 2_451_545) / 36_525;
  const args = ARGUMENTS.map(c => {
    let angle = ((c[0] + (c[1] + (c[2] + c[3] * t) * t) * t) * Math.PI / (180 * 3600)
      + (c[4] * t % 1) * (2 * Math.PI)) % (2 * Math.PI);
    if (Math.abs(angle) >= Math.PI) angle -= Math.sign(angle) * (2 * Math.PI);
    return angle;
  });
  let sum = 0;
  for (let i = TERMS.length - 1; i >= 0; i--) {
    const term = TERMS[i];
    let argument = 0;
    for (let j = 0; j < args.length; j++) argument += term[j] * args[j];
    sum += (term[5] + term[6] * t) * Math.sin(argument);
  }
  return sum / 10_000 / 3_600;
}
`);
const licenseDir = new URL("../src/main/resources/META-INF/licenses/", import.meta.url);
await mkdir(licenseDir, { recursive: true });
await writeFile(new URL("ERFA.txt", licenseDir), `${sourceUrl}\nSource SHA-256: ${sha}\n\n${license}\n`);
const distributionLicenses = new URL("../licenses/", import.meta.url);
await mkdir(distributionLicenses, { recursive: true });
await writeFile(new URL("ERFA.txt", distributionLicenses), `${sourceUrl}\nSource SHA-256: ${sha}\n\n${license}\n`);
console.log(JSON.stringify({ sourceUrl, sha256: sha, terms: table.length }));
