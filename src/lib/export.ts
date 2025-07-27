import { format } from "date-fns";
import type { InjectionEnhanced } from "@/db/schema";
import type { AdvancedAnalytics } from "./analytics";

export interface ExportOptions {
  format: "csv" | "pdf";
  includeAnalytics?: boolean;
  includeSummary?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Export injections to CSV format
 */
export function exportToCSV(injections: InjectionEnhanced[], _options?: ExportOptions): string {
  const headers = [
    "Date",
    "Time",
    "Type",
    "Insulin Type",
    "Brand",
    "Dosage (units)",
    "Blood Glucose Before",
    "Blood Glucose After",
    "BG Unit",
    "Meal Type",
    "Carbs (g)",
    "Injection Site",
    "Notes",
  ];

  const rows = injections.map((injection) => {
    return [
      format(injection.injectionTime, "yyyy-MM-dd"),
      format(injection.injectionTime, "HH:mm"),
      injection.injectionType,
      injection.insulinType || "",
      injection.insulinBrand || "",
      injection.dosageUnits?.toString() || "",
      injection.bloodGlucoseBefore?.toString() || "",
      injection.bloodGlucoseAfter?.toString() || "",
      injection.bloodGlucoseUnit || "",
      injection.mealType || "",
      injection.carbsGrams?.toString() || "",
      injection.injectionSite || "",
      injection.notes || "",
    ];
  });

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  return csvContent;
}

/**
 * Generate HTML report (can be converted to PDF)
 */
export function generateHTMLReport(
  injections: InjectionEnhanced[],
  analytics?: AdvancedAnalytics,
  userName?: string,
): string {
  const reportDate = format(new Date(), "MMMM d, yyyy");
  const dateRange =
    injections.length > 0
      ? `${format(injections[injections.length - 1].injectionTime, "MMM d, yyyy")} - ${format(injections[0].injectionTime, "MMM d, yyyy")}`
      : "No data";

  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Insulin Injection Report</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3 {
      color: #2563eb;
    }
    .header {
      border-bottom: 2px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .summary {
      background-color: #f3f4f6;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }
    .summary-item {
      background: white;
      padding: 15px;
      border-radius: 4px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .summary-value {
      font-size: 24px;
      font-weight: bold;
      color: #2563eb;
    }
    .summary-label {
      color: #6b7280;
      font-size: 14px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th, td {
      border: 1px solid #e5e7eb;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f3f4f6;
      font-weight: bold;
    }
    tr:nth-child(even) {
      background-color: #f9fafb;
    }
    .insights {
      background-color: #fef3c7;
      border: 1px solid #fbbf24;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .insights h3 {
      color: #d97706;
      margin-top: 0;
    }
    .insight-item {
      margin: 10px 0;
      padding-left: 20px;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Insulin Injection Report</h1>
    <p><strong>Patient:</strong> ${userName || "All Users"}</p>
    <p><strong>Report Date:</strong> ${reportDate}</p>
    <p><strong>Data Range:</strong> ${dateRange}</p>
  </div>
`;

  // Add summary section if analytics available
  if (analytics) {
    const totalInjections = injections.length;
    const avgCompliance =
      analytics.complianceTrends.daily.reduce((sum, day) => sum + day.complianceRate, 0) /
      analytics.complianceTrends.daily.length;
    const perfectDays = analytics.complianceTrends.daily.filter((day) => day.perfectDay).length;

    html += `
  <div class="summary">
    <h2>Summary</h2>
    <div class="summary-grid">
      <div class="summary-item">
        <div class="summary-value">${totalInjections}</div>
        <div class="summary-label">Total Injections</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${Math.round(avgCompliance)}%</div>
        <div class="summary-label">Average Compliance</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${perfectDays}</div>
        <div class="summary-label">Perfect Days</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${analytics.glucosePatterns?.timeInRange || "N/A"}%</div>
        <div class="summary-label">Time in Range (70-180 mg/dL)</div>
      </div>
    </div>
  </div>
`;

    // Add insights section
    if (analytics.insights.length > 0) {
      html += `
  <div class="insights">
    <h3>Key Insights</h3>
    ${analytics.insights
      .map(
        (insight) => `
    <div class="insight-item">• ${insight.message}</div>
    `,
      )
      .join("")}
  </div>
`;
    }
  }

  // Add injection history table
  html += `
  <h2>Injection History</h2>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Time</th>
        <th>Type</th>
        <th>Insulin</th>
        <th>Dosage</th>
        <th>BG Before</th>
        <th>BG After</th>
        <th>Carbs</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>
`;

  injections.forEach((injection) => {
    html += `
      <tr>
        <td>${format(injection.injectionTime, "MM/dd/yyyy")}</td>
        <td>${format(injection.injectionTime, "HH:mm")}</td>
        <td>${injection.injectionType}</td>
        <td>${injection.insulinBrand || injection.insulinType || "-"}</td>
        <td>${injection.dosageUnits ? `${injection.dosageUnits} units` : "-"}</td>
        <td>${injection.bloodGlucoseBefore || "-"}</td>
        <td>${injection.bloodGlucoseAfter || "-"}</td>
        <td>${injection.carbsGrams ? `${injection.carbsGrams}g` : "-"}</td>
        <td>${injection.notes || "-"}</td>
      </tr>
`;
  });

  html += `
    </tbody>
  </table>
</body>
</html>
`;

  return html;
}

/**
 * Download file helper
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Export data with the specified format
 */
export async function exportData(
  injections: InjectionEnhanced[],
  options: ExportOptions,
  analytics?: AdvancedAnalytics,
  userName?: string,
): Promise<void> {
  const timestamp = format(new Date(), "yyyy-MM-dd-HHmm");

  if (options.format === "csv") {
    const csv = exportToCSV(injections, options);
    downloadFile(csv, `insulin-data-${timestamp}.csv`, "text/csv");
  } else if (options.format === "pdf") {
    const html = generateHTMLReport(injections, analytics, userName);

    // For actual PDF generation, you would need a library like jsPDF or html2pdf
    // For now, we'll save as HTML which can be printed to PDF
    downloadFile(html, `insulin-report-${timestamp}.html`, "text/html");

    // Open print dialog for PDF creation
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
  }
}
