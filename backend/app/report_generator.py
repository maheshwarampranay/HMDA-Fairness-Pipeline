import os
import io
import json
from typing import Dict, Any
from jinja2 import Template

HTML_REPORT_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Fairness & Bias Audit Report - {{ data.model_name }}</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      color: #1a202c;
      background: #ffffff;
      margin: 0;
      padding: 40px;
      line-height: 1.6;
    }
    .header {
      border-bottom: 3px solid #006a4e;
      padding-bottom: 20px;
      margin-bottom: 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand {
      font-size: 24px;
      font-weight: 800;
      color: #006a4e;
    }
    .title {
      font-size: 20px;
      font-weight: 600;
      color: #2d3748;
      margin-top: 5px;
    }
    .status-badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 700;
      font-size: 14px;
      text-transform: uppercase;
    }
    .status-PASS { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
    .status-FLAG { background: #fffbeb; color: #d97706; border: 1px solid #fde68a; }
    .status-HIGH_BIAS { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }

    .section {
      margin-bottom: 35px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: #006a4e;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 8px;
      margin-bottom: 15px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }
    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 15px;
    }
    .card-label { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; }
    .card-value { font-size: 22px; font-weight: 700; color: #1e293b; margin-top: 5px; }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 13px;
    }
    th {
      background: #f1f5f9;
      color: #475569;
      text-align: left;
      padding: 10px 12px;
      font-weight: 600;
      border-bottom: 2px solid #e2e8f0;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    tr:nth-child(even) { background: #fafafa; }
    .footer {
      margin-top: 50px;
      border-top: 1px solid #e2e8f0;
      padding-top: 15px;
      font-size: 11px;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">LLOYDS BANKING GROUP</div>
      <div class="title">Fairness & Bias Audit Executive Report</div>
    </div>
    <div>
      <span class="status-badge status-{{ data.overall_status | replace(' ', '_') }}">
        Overall Audit: {{ data.overall_status }}
      </span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">1. Model Overview & Configured Risk Tier</div>
    <div class="grid">
      <div class="card">
        <div class="card-label">Model Name</div>
        <div class="card-value">{{ data.model_name }}</div>
      </div>
      <div class="card">
        <div class="card-label">Risk Tier</div>
        <div class="card-value" style="text-transform: capitalize;">{{ data.risk_tier }}</div>
      </div>
      <div class="card">
        <div class="card-label">Total Sample Size</div>
        <div class="card-value">{{ data.total_samples }}</div>
      </div>
      <div class="card">
        <div class="card-label">Overall Fairness Score</div>
        <div class="card-value">{{ data.overall_fairness_score }}%</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">2. Predictive Model Performance</div>
    <div class="grid">
      <div class="card">
        <div class="card-label">Accuracy</div>
        <div class="card-value">{{ (data.performance.accuracy * 100) | round(2) }}%</div>
      </div>
      <div class="card">
        <div class="card-label">Precision</div>
        <div class="card-value">{{ (data.performance.precision * 100) | round(2) }}%</div>
      </div>
      <div class="card">
        <div class="card-label">Recall (TPR)</div>
        <div class="card-value">{{ (data.performance.recall * 100) | round(2) }}%</div>
      </div>
      <div class="card">
        <div class="card-label">ROC-AUC</div>
        <div class="card-value">{{ (data.performance.roc_auc * 100) | round(2) }}%</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">3. Single Feature Protected Attribute Fairness Audit</div>
    <table>
      <thead>
        <tr>
          <th>Protected Attribute</th>
          <th>Reference Group</th>
          <th>Disparate Impact Ratio</th>
          <th>Demographic Parity Diff</th>
          <th>Equalized Odds Diff</th>
          <th>Compliance Status</th>
        </tr>
      </thead>
      <tbody>
        {% for audit in data.protected_audits %}
        <tr>
          <td><strong>{{ audit.attribute }}</strong></td>
          <td>{{ audit.reference_group }}</td>
          <td>{{ audit.disparate_impact_ratio }}</td>
          <td>{{ (audit.demographic_parity_diff * 100) | round(2) }}%</td>
          <td>{{ (audit.equalized_odds_diff * 100) | round(2) }}%</td>
          <td>
            <span class="status-badge status-{{ audit.status | replace(' ', '_') }}">
              {{ audit.status }}
            </span>
          </td>
        </tr>
        {% endfor %}
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">4. Subgroup Level Fairness Summary</div>
    <table>
      <thead>
        <tr>
          <th>Subgroup Combination</th>
          <th>Sample Count</th>
          <th>Selection Rate</th>
          <th>Accuracy</th>
          <th>Disparity Ratio</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {% for sg in data.subgroup_analysis[:10] %}
        <tr>
          <td><strong>{{ sg.label }}</strong></td>
          <td>{{ sg.count }}</td>
          <td>{{ (sg.selection_rate * 100) | round(1) }}%</td>
          <td>{{ (sg.accuracy * 100) | round(1) }}%</td>
          <td>{{ sg.disparity_ratio }}</td>
          <td>
            <span class="status-badge status-{{ sg.status | replace(' ', '_') }}">
              {{ sg.status }}
            </span>
          </td>
        </tr>
        {% endfor %}
      </tbody>
    </table>
  </div>

  <div class="footer">
    Generated by Lloyds Automated Bias & Fairness Pipeline Engine • Confidential Audit Artifact
  </div>
</body>
</html>
"""

def generate_html_report(analysis_data: Dict[str, Any]) -> str:
    """Renders HTML audit report."""
    template = Template(HTML_REPORT_TEMPLATE)
    return template.render(data=analysis_data)

def generate_pdf_report(analysis_data: Dict[str, Any]) -> bytes:
    """Generates PDF audit report using ReportLab or fallback HTML conversion."""
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
        story = []
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=18, textColor=colors.HexColor('#006a4e'))
        subtitle_style = ParagraphStyle('Sub', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor('#64748b'))
        h2_style = ParagraphStyle('H2', parent=styles['Heading2'], fontSize=12, textColor=colors.HexColor('#006a4e'), spaceBefore=10)
        body_style = ParagraphStyle('Body', parent=styles['Normal'], fontSize=9, leading=12)

        story.append(Paragraph("<b>LLOYDS BANKING GROUP</b>", subtitle_style))
        story.append(Paragraph("Fairness & Bias Audit Executive Report", title_style))
        story.append(Paragraph(f"Model: <b>{analysis_data.get('model_name')}</b> | Risk Tier: <b>{analysis_data.get('risk_tier').upper()}</b> | Status: <b>{analysis_data.get('overall_status')}</b>", body_style))
        story.append(Spacer(1, 10))
        story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#006a4e')))
        story.append(Spacer(1, 15))

        # Model Performance Table
        story.append(Paragraph("1. Model Performance Overview", h2_style))
        perf = analysis_data.get("performance", {})
        perf_data = [
            ["Metric", "Value", "Metric", "Value"],
            ["Accuracy", f"{perf.get('accuracy', 0)*100:.1f}%", "Precision", f"{perf.get('precision', 0)*100:.1f}%"],
            ["Recall (TPR)", f"{perf.get('recall', 0)*100:.1f}%", "ROC-AUC", f"{perf.get('roc_auc', 0)*100:.1f}%"],
            ["Specificity", f"{perf.get('specificity', 0)*100:.1f}%", "Total Samples", str(analysis_data.get("total_samples", 0))]
        ]
        t1 = Table(perf_data, colWidths=[120, 120, 120, 120])
        t1.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#006a4e')),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(t1)
        story.append(Spacer(1, 15))

        # Protected Attributes Table
        story.append(Paragraph("2. Protected Attributes Fairness Audit", h2_style))
        prot_data = [["Attribute", "Ref Group", "Disparate Impact", "Demographic Parity", "Status"]]
        for audit in analysis_data.get("protected_audits", []):
            prot_data.append([
                audit.get("attribute"),
                audit.get("reference_group"),
                str(audit.get("disparate_impact_ratio")),
                f"{audit.get('demographic_parity_diff', 0)*100:.1f}%",
                audit.get("status")
            ])
        t2 = Table(prot_data, colWidths=[110, 110, 110, 110, 80])
        t2.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#006a4e')),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(t2)

        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()
    except Exception:
        # Fallback to UTF-8 encoded HTML if PDF generator fails
        return generate_html_report(analysis_data).encode('utf-8')
