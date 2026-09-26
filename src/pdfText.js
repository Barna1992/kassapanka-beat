import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

// Items whose baselines differ by less than this (PDF units) are on the same line.
const LINE_TOLERANCE = 3

/** Extracts the text of a PDF as lines in reading order (top to bottom, left to right). */
export async function extractPdfLines(file) {
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
  const lines = []

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const { items } = await page.getTextContent()
    const rows = []

    for (const item of items) {
      if (!item.str?.trim()) continue
      const x = item.transform[4]
      const y = item.transform[5]
      let row = rows.find((r) => Math.abs(r.y - y) < LINE_TOLERANCE)
      if (!row) rows.push((row = { y, parts: [] }))
      row.parts.push({ x, str: item.str })
    }

    rows
      .sort((a, b) => b.y - a.y)
      .forEach((r) => lines.push(r.parts.sort((a, b) => a.x - b.x).map((part) => part.str).join(' ')))
  }

  return lines
}
