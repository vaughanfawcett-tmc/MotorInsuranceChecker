/**
 * Seeds the database with synthetic submissions covering every decision path so
 * the reviewer dashboard has realistic data on first run. Run: `npm run db:seed`.
 * Uses the real validation engine, so seeded decisions match production logic.
 */
import { PrismaClient } from "@prisma/client";
import { DocumentType } from "../src/domain/constants";
import { BusinessUseStatement } from "../src/domain/extraction.schema";
import type { CertificateExtraction } from "../src/domain/extraction.schema";
import { validateCertificate } from "../src/domain/validate";
import { SeedTmcClient } from "../src/services/tmc/seed-tmc-client";
import { AuditAction, SYSTEM_ACTOR } from "../src/services/audit";

const prisma = new PrismaClient();

function baseExtraction(
  overrides: Partial<CertificateExtraction>,
): CertificateExtraction {
  return {
    documentType: DocumentType.CERTIFICATE_OF_MOTOR_INSURANCE,
    documentTypeConfidence: 0.97,
    legible: true,
    signsOfTampering: false,
    policyholderName: "John Smith",
    driverNames: ["John Smith"],
    vehicleRegistration: "AB12 CDE",
    vehicleMakeModel: "Ford Transit",
    permittedUsageText: "Social, Domestic & Pleasure and Business Use",
    businessUseStated: BusinessUseStatement.YES,
    policyNumber: "POL-100",
    insurerName: "Aviva",
    policyStartDate: "2026-01-01",
    policyEndDate: "2026-12-31",
    overallConfidence: 0.95,
    notes: "Synthetic seed data.",
    ...overrides,
  };
}

interface Scenario {
  tmcReference: string;
  filename: string;
  extraction: CertificateExtraction;
}

const scenarios: Scenario[] = [
  {
    tmcReference: "EMP-001",
    filename: "smith-certificate.pdf",
    extraction: baseExtraction({}),
  },
  {
    tmcReference: "EMP-002",
    filename: "patel-certificate.pdf",
    extraction: baseExtraction({
      policyholderName: "Sarah Patel",
      driverNames: ["Sarah Patel"],
      vehicleRegistration: "ZZ99 ZZZ", // does not match EMP-002 (LD68 KPH)
      insurerName: "Direct Line",
      policyNumber: "POL-200",
    }),
  },
  {
    tmcReference: "EMP-003",
    filename: "oconnor-screenshot.png",
    extraction: baseExtraction({
      policyholderName: "Michael O'Connor",
      driverNames: ["Michael O'Connor"],
      vehicleRegistration: "GH19 XYZ",
      businessUseStated: BusinessUseStatement.UNCLEAR,
      permittedUsageText: "Class 1 use",
      insurerName: "LV",
      policyNumber: "POL-300",
    }),
  },
  {
    tmcReference: "EMP-001",
    filename: "smith-sdp-only.pdf",
    extraction: baseExtraction({
      businessUseStated: BusinessUseStatement.NO,
      permittedUsageText: "Social, Domestic & Pleasure only",
      policyNumber: "POL-101",
    }),
  },
  {
    tmcReference: "EMP-001",
    filename: "smith-low-quality.jpg",
    extraction: baseExtraction({
      overallConfidence: 0.4,
      policyNumber: "POL-102",
      notes: "Low-quality scan; extraction uncertain.",
    }),
  },
];

async function main(): Promise<void> {
  const tmc = await SeedTmcClient.fromFixtures();
  const asOf = new Date().toISOString().slice(0, 10);

  // Idempotent: clear prior seed data (audit first due to FK).
  await prisma.auditLog.deleteMany();
  await prisma.submission.deleteMany();

  for (const scenario of scenarios) {
    const record = await tmc.getRecord(scenario.tmcReference);
    if (!record) throw new Error(`Missing fixture for ${scenario.tmcReference}`);

    const result = validateCertificate({
      extraction: scenario.extraction,
      tmc: record,
      asOf,
      confidenceThreshold: 0.7,
    });

    const submission = await prisma.submission.create({
      data: {
        tmcReference: scenario.tmcReference,
        originalFilename: scenario.filename,
        mediaType: scenario.filename.endsWith(".pdf")
          ? "application/pdf"
          : scenario.filename.endsWith(".png")
            ? "image/png"
            : "image/jpeg",
        fileSize: 100_000,
        fileSha256: `seed-${scenario.filename}`,
        storedPath: `seed://${scenario.filename}`,
        extractionMode: "mock",
        status: result.decision,
        extractionJson: JSON.stringify(scenario.extraction),
        checksJson: JSON.stringify(result.checks),
        rejectionReasonsJson: JSON.stringify(result.rejectionReasons),
      },
    });

    await prisma.auditLog.create({
      data: {
        submissionId: submission.id,
        actor: SYSTEM_ACTOR,
        action: AuditAction.SUBMISSION_RECEIVED,
        detail: `Received ${scenario.filename} for ${scenario.tmcReference}.`,
      },
    });
    await prisma.auditLog.create({
      data: {
        submissionId: submission.id,
        actor: SYSTEM_ACTOR,
        action: AuditAction.DECISION_RECORDED,
        detail: `Automated decision: ${result.decision}.`,
        metadataJson: JSON.stringify({
          rejectionReasons: result.rejectionReasons,
        }),
      },
    });
  }

  const counts = await prisma.submission.groupBy({
    by: ["status"],
    _count: true,
  });
  // eslint-disable-next-line no-console
  console.log("Seeded submissions:", counts);
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
