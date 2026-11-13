import { Exam } from '../models/Exam.js';
import { Attempt } from '../models/Attempt.js';
import { Violation } from '../models/Violation.js';
import PDFDocument from 'pdfkit';

export async function exportExamResultsCsv(req, res, next) {
  try {
    const { examId } = req.params;
    const exam = await Exam.findOne({ _id: examId, teacherId: req.teacher._id });
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    const attempts = await Attempt.find({ examId }).sort({ score: -1 });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="results_${exam.title.replace(/\s+/g, '_')}.csv"`
    );

    res.write('Rank,Roll No,Name,Email,Institute,Score,Total Marks,Status,Violations,Started At,Submitted At\n');

    attempts.forEach((att, idx) => {
      res.write(
        `${idx + 1},"${att.rollNo}","${att.name}","${att.email}","${att.institute}",${att.score || 0},${
          att.totalMarks || 10
        },${att.status},${att.violationCount},"${att.startedAt ? att.startedAt.toISOString() : ''}","${
          att.submittedAt ? att.submittedAt.toISOString() : ''
        }"\n`
      );
    });

    res.end();
  } catch (error) {
    next(error);
  }
}

export async function exportAttemptPdfReport(req, res, next) {
  try {
    const { id } = req.params;
    const attempt = await Attempt.findById(id);
    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Attempt not found' });
    }

    const exam = await Exam.findOne({ _id: attempt.examId, teacherId: req.teacher._id });
    if (!exam) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const violations = await Violation.find({ attemptId: id }).sort({ occurredAt: 1 });

    // Generate PDF via PDFKit
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="audit_${attempt.rollNo}_${attempt.name.replace(/\s+/g, '_')}.pdf"`
    );

    doc.pipe(res);

    // Header Branding
    doc
      .fillColor('#4F46E5')
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('Exam.co', 40, 40);

    doc
      .fillColor('#64748B')
      .fontSize(10)
      .font('Helvetica')
      .text('Proctored Examination Integrity Report', 40, 68);

    doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(40, 85).lineTo(550, 85).stroke();

    // Examination & Candidate Metadata
    doc.fillColor('#0F172A').fontSize(14).font('Helvetica-Bold').text('Candidate Summary', 40, 100);

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#334155')
      .text(`Candidate Name: ${attempt.name}`, 40, 122)
      .text(`Roll / ID Number: ${attempt.rollNo}`, 40, 137)
      .text(`Email Address: ${attempt.email}`, 40, 152)
      .text(`Institution: ${attempt.institute}`, 40, 167)
      .text(`Examination: ${exam.title}`, 300, 122)
      .text(`Final Score: ${attempt.score} / ${attempt.totalMarks}`, 300, 137)
      .text(`Submission Status: ${attempt.status.toUpperCase()}`, 300, 152)
      .text(`Total Logged Violations: ${attempt.violationCount}`, 300, 167);

    doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(40, 195).lineTo(550, 195).stroke();

    // Incident Timeline Section
    doc
      .fillColor('#0F172A')
      .fontSize(14)
      .font('Helvetica-Bold')
      .text(`Incident Audit Trail (${violations.length} Events)`, 40, 215);

    let yPosition = 240;

    if (violations.length === 0) {
      doc
        .fontSize(10)
        .font('Helvetica-Oblique')
        .fillColor('#10B981')
        .text('No proctoring violations or suspicious activities were detected during this session.', 40, yPosition);
    } else {
      violations.forEach((v, index) => {
        if (yPosition > 720) {
          doc.addPage();
          yPosition = 50;
        }

        doc
          .rect(40, yPosition, 510, 45)
          .fillAndStroke('#F8FAFC', '#E2E8F0');

        doc
          .fillColor('#EF4444')
          .fontSize(9)
          .font('Helvetica-Bold')
          .text(`[INCIDENT #${index + 1}] ${v.type.toUpperCase().replace(/_/g, ' ')}`, 50, yPosition + 10);

        doc
          .fillColor('#64748B')
          .fontSize(8)
          .font('Helvetica')
          .text(new Date(v.occurredAt).toLocaleString(), 400, yPosition + 10);

        doc
          .fillColor('#334155')
          .fontSize(8.5)
          .font('Helvetica')
          .text(v.details || 'Event logged by proctor monitor', 50, yPosition + 25, { width: 480 });

        yPosition += 55;
      });
    }

    doc.end();
  } catch (error) {
    next(error);
  }
}
