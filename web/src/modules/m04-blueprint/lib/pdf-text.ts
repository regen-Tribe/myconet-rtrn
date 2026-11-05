/** Text of a PDF, page by page, with [Page N] markers so answers can cite pages. */
export async function extractPdfText(file: File, onProgress?: (page: number, total: number) => void): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
  const parts: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items.map((item: any) => item.str).join(' ')
    // Page markers let the scan cite where each answer came from
    parts.push(`[Page ${i}]\n${pageText}`)
    page.cleanup()
    onProgress?.(i, pdf.numPages)
  }
  return parts.join('\n\n')
}
