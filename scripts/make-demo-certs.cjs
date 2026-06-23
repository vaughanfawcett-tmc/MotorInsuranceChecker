/*
 * Generates sample documents for manual testing, into ./demo.
 * Run: npm run demo:certs
 *
 * These are synthetic. They are designed so you can see each decision path:
 *   pass-*.pdf      -> should be APPROVED for the stated TMC reference
 *   fail-*.pdf      -> should be REJECTED (several rules fail)
 *   notcert-*.pdf   -> should be REJECTED (not a certificate of motor insurance)
 *
 * No external dependencies: writes minimal, valid PDFs with embedded text so the
 * extractor reads them like any other document.
 */
const fs = require("node:fs");
const path = require("node:path");

const PAGE_W = 595;
const PAGE_H = 842;

// Font ids: F1 = Helvetica, F2 = Helvetica-Bold.
function esc(s) {
  return s.replace(/[()\\]/g, "\\$&");
}

/**
 * lines: array of { text, size?, bold?, gap? }
 * Renders top-to-bottom from y=790 with per-line advance.
 */
function buildPdf(lines) {
  let y = 790;
  let body = "";
  for (const line of lines) {
    const size = line.size ?? 11;
    const font = line.bold ? "F2" : "F1";
    y -= line.gap ?? size + 7;
    body += `BT /${font} ${size} Tf 56 ${y} Td (${esc(line.text)}) Tj ET\n`;
  }

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${body.length} >>\nstream\n${body}endstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((o, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((off) => {
    pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

function certLines(c) {
  return [
    { text: c.insurer, size: 16, bold: true },
    { text: "Certificate of Motor Insurance", size: 18, bold: true, gap: 30 },
    { text: `Certificate Number: ${c.policyNumber}`, gap: 26 },
    { text: "1. Policyholder", bold: true, gap: 22 },
    { text: c.policyholder },
    { text: "2. Registration mark of the vehicle", bold: true, gap: 22 },
    { text: c.registration },
    { text: `Make / Model: ${c.makeModel}` },
    { text: "3. Effective date of commencement of insurance", bold: true, gap: 22 },
    { text: c.startDate },
    { text: "4. Date of expiry of insurance", bold: true, gap: 22 },
    { text: c.endDate },
    { text: "5. Persons or classes of persons entitled to drive", bold: true, gap: 22 },
    { text: c.policyholder },
    { text: "6. Limitations as to use", bold: true, gap: 22 },
    { text: c.usage },
    {
      text: "I hereby certify that the policy to which this certificate relates",
      gap: 30,
    },
    { text: "satisfies the requirements of the relevant law (Road Traffic Act 1988)." },
    { text: `Authorised signatory, ${c.insurer}`, gap: 26 },
  ];
}

const outDir = path.join(process.cwd(), "demo");
fs.mkdirSync(outDir, { recursive: true });

const docs = [
  {
    file: "pass-john-smith.pdf",
    tmcReference: "EMP-001",
    expected: "APPROVED",
    lines: certLines({
      insurer: "Aviva Insurance Limited",
      policyNumber: "AV-2026-558210",
      policyholder: "John Smith",
      registration: "AB12 CDE",
      makeModel: "Ford Transit",
      startDate: "01 January 2026",
      endDate: "31 December 2026",
      usage:
        "Use for social, domestic and pleasure purposes and for the policyholder's business use.",
    }),
  },
  {
    file: "fail-john-smith.pdf",
    tmcReference: "EMP-001",
    expected: "REJECTED (wrong vehicle, no business use, expired)",
    lines: certLines({
      insurer: "Direct Line Insurance",
      policyNumber: "DL-2023-112004",
      policyholder: "John Smith",
      registration: "XY99 ZZZ",
      makeModel: "Vauxhall Corsa",
      startDate: "01 January 2023",
      endDate: "31 December 2023",
      usage:
        "Use for social, domestic and pleasure purposes only. Excludes business use.",
    }),
  },
  {
    file: "notcert-invoice.pdf",
    tmcReference: "EMP-001",
    expected: "REJECTED (not a Certificate of Motor Insurance)",
    lines: [
      { text: "Direct Line Insurance", size: 16, bold: true },
      { text: "Premium Invoice", size: 18, bold: true, gap: 30 },
      { text: "Invoice Number: INV-99213", gap: 24 },
      { text: "Account holder: John Smith", gap: 20 },
      { text: "Annual premium: GBP 642.00", gap: 20 },
      { text: "Amount due: GBP 0.00 (paid in full)", gap: 20 },
      { text: "Thank you for your payment.", gap: 28 },
      {
        text: "This document is an invoice and is not evidence of insurance cover.",
      },
    ],
  },
];

for (const doc of docs) {
  fs.writeFileSync(path.join(outDir, doc.file), buildPdf(doc.lines));
}

const readme = [
  "# Demo certificates",
  "",
  "Synthetic documents for testing the validator. Upload each one on the Upload",
  "page using the TMC reference shown, and compare the decision to 'Expected'.",
  "",
  ...docs.map(
    (d) => `- **${d.file}** - reference \`${d.tmcReference}\` - expected: ${d.expected}`,
  ),
  "",
  "Notes:",
  "- pass/fail both use reference EMP-001 (John Smith / AB12 CDE in the TMC fixtures),",
  "  so the fail case clearly shows the vehicle mismatch and other failures.",
  "- Without an extraction provider key set, uploads use the mock extractor and do",
  "  not reflect these files. With OPENAI_API_KEY set, the documents are read for real.",
  "",
].join("\n");
fs.writeFileSync(path.join(outDir, "README.md"), readme);

// eslint-disable-next-line no-console
console.log(
  `Wrote ${docs.length} demo documents to ./demo:\n` +
    docs.map((d) => `  ${d.file}  (${d.tmcReference}) -> ${d.expected}`).join("\n"),
);
