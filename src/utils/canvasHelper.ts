/**
 * Canvas utility to capture compressed screenshots from HTMLVideoElement (Webcam or Screen)
 * or generate simulated evidence frames with timecode and student watermark.
 */

export interface CapturedEvidence {
  dataUrl: string;
  blob?: Blob;
  capturedAt: string;
}

export function captureVideoFrame(
  video: HTMLVideoElement,
  watermarkText?: string,
  maxWidth = 720,
  quality = 0.72
): string {
  try {
    if (!video || video.readyState < 2) return '';
    const canvas = document.createElement('canvas');
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 360;

    const ratio = Math.min(1, maxWidth / width);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);

    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Add timecode & student watermark banner at bottom
    if (watermarkText) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.fillRect(0, canvas.height - 24, canvas.width, 24);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '11px sans-serif';
      ctx.fillText(
        `Exam.co EVIDENCE · ${watermarkText} · ${new Date().toISOString()}`,
        8,
        canvas.height - 8
      );
    }

    return canvas.toDataURL('image/jpeg', quality);
  } catch (err) {
    console.error('Failed to capture frame from video:', err);
    return '';
  }
}

/**
 * Generates an educational-style realistic simulated screenshot for demo mode or fallbacks
 */
export function generateSimulatedScreenEvidence(
  studentName: string,
  violationLabel: string,
  questionNumber: number = 3
): string {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background desktop
  const bgGrad = ctx.createLinearGradient(0, 0, 640, 360);
  bgGrad.addColorStop(0, '#EEF2FF');
  bgGrad.addColorStop(1, '#E0E7FF');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 640, 360);

  // Top browser mock bar
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(20, 20, 600, 30);
  ctx.fillStyle = '#EF4444';
  ctx.beginPath();
  ctx.arc(36, 35, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#F59E0B';
  ctx.beginPath();
  ctx.arc(48, 35, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#10B981';
  ctx.beginPath();
  ctx.arc(60, 35, 4, 0, Math.PI * 2);
  ctx.fill();

  // Browser URL bar
  ctx.fillStyle = '#F1F5F9';
  ctx.roundRect ? ctx.roundRect(80, 26, 360, 18, 4) : ctx.rect(80, 26, 360, 18);
  ctx.fill();
  ctx.fillStyle = '#64748B';
  ctx.font = '10px monospace';
  ctx.fillText('https://exam.co/exam/ex-cs101-2026', 90, 39);

  // Mock exam window inside
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(20, 50, 600, 280);

  // Question header
  ctx.fillStyle = '#4F46E5';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(`Question ${questionNumber} of 10 (Single Choice)`, 36, 75);

  ctx.fillStyle = '#1E293B';
  ctx.font = '12px sans-serif';
  ctx.fillText('Which data structure uses LIFO (Last-In-First-Out) principle?', 36, 100);

  // Options
  const options = ['A. Queue', 'B. Stack (Selected)', 'C. Array', 'D. Hash Table'];
  options.forEach((opt, idx) => {
    ctx.fillStyle = idx === 1 ? '#EEF2FF' : '#F8FAFC';
    ctx.fillRect(36, 115 + idx * 26, 380, 20);
    ctx.strokeStyle = idx === 1 ? '#4F46E5' : '#E2E8F0';
    ctx.strokeRect(36, 115 + idx * 26, 380, 20);
    ctx.fillStyle = idx === 1 ? '#4F46E5' : '#475569';
    ctx.font = idx === 1 ? 'bold 11px sans-serif' : '11px sans-serif';
    ctx.fillText(opt, 46, 129 + idx * 26);
  });

  // Stamp a red/orange banner for detected event
  ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
  ctx.fillRect(20, 290, 600, 40);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText(
    `[INCIDENT CAPTURE] ${violationLabel.toUpperCase()} · Student: ${studentName}`,
    36,
    306
  );
  ctx.font = '10px monospace';
  ctx.fillText(`Timestamp: ${new Date().toLocaleTimeString()} · Resolution: 1920x1080`, 36, 322);

  return canvas.toDataURL('image/jpeg', 0.8);
}

/**
 * Generates an educational-style realistic webcam snapshot
 */
export function generateSimulatedWebcamEvidence(studentName: string, flag: 'normal' | 'no_face' | 'multiple_faces' = 'normal'): string {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 240;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Room background
  const bg = ctx.createLinearGradient(0, 0, 320, 240);
  bg.addColorStop(0, '#E2E8F0');
  bg.addColorStop(1, '#CBD5E1');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 320, 240);

  if (flag === 'no_face') {
    // Empty chair
    ctx.fillStyle = '#475569';
    ctx.fillRect(110, 140, 100, 80);
    ctx.fillStyle = '#64748B';
    ctx.fillRect(120, 80, 80, 70);

    // Red warning tag
    ctx.fillStyle = 'rgba(168, 85, 247, 0.9)';
    ctx.fillRect(0, 195, 320, 45);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('AI PROCTOR: NO FACE IN WEBCAM FRAME', 16, 215);
    ctx.font = '9px monospace';
    ctx.fillText(`Subject: ${studentName}`, 16, 230);
  } else if (flag === 'multiple_faces') {
    // Face 1 (Student)
    drawFaceSilhouette(ctx, 100, 100, '#6366F1');
    // Face 2 (Second person)
    drawFaceSilhouette(ctx, 220, 95, '#F43F5E');

    ctx.fillStyle = 'rgba(244, 63, 94, 0.9)';
    ctx.fillRect(0, 195, 320, 45);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('AI PROCTOR: 2 FACES DETECTED', 16, 215);
    ctx.font = '9px monospace';
    ctx.fillText(`Subject: ${studentName} + 1 unauthorized individual`, 16, 230);
  } else {
    // Normal single face
    drawFaceSilhouette(ctx, 160, 100, '#4F46E5');
    ctx.fillStyle = 'rgba(34, 197, 94, 0.85)';
    ctx.fillRect(0, 205, 320, 35);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(`WEBCAM FEED · ${studentName} · VERIFIED`, 16, 225);
  }

  return canvas.toDataURL('image/jpeg', 0.8);
}

function drawFaceSilhouette(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string) {
  // Head
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, 34, 0, Math.PI * 2);
  ctx.fill();

  // Shoulders
  ctx.beginPath();
  ctx.ellipse(cx, cy + 70, 55, 35, 0, 0, Math.PI);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(cx - 10, cy - 4, 3, 0, Math.PI * 2);
  ctx.arc(cx + 10, cy - 4, 3, 0, Math.PI * 2);
  ctx.fill();
}
