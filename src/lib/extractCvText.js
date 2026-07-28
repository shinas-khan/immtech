// Real CV text extraction for PDF / DOCX / TXT.
//
// This replaces a previous fallback that, for anything that wasn't .txt,
// just walked the raw file bytes and kept whatever looked like a printable
// ASCII character. That "worked" only by accident on the simplest,
// uncompressed PDFs - most real PDFs compress their text streams
// (FlateDecode), and a .docx is a zip archive, so both would decode to
// mostly binary noise. That noise still cleared the API's `length > 50`
// check, so the AI was silently scoring garbage instead of the CV, with no
// signal to the user that anything had gone wrong beyond a vague
// recommendation to "try .txt instead."
//
// pdf.js and mammoth do real parsing, entirely client-side - the CV never
// leaves the browser for this step, which is also just a better privacy
// story than shipping the raw file to a parsing server.
import * as pdfjsLib from "pdfjs-dist"
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url"
import mammoth from "mammoth"

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl

async function extractPdfText(file) {
  const buffer = await file.arrayBuffer()
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise
  const pageTexts = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    pageTexts.push(content.items.map(it => it.str).join(" "))
  }
  return pageTexts.join("\n\n")
}

async function extractDocxText(file) {
  const buffer = await file.arrayBuffer()
  const { value } = await mammoth.extractRawText({ arrayBuffer: buffer })
  return value
}

// Returns { text, method, warning }. `warning` is set (not thrown) when
// extraction technically succeeded but produced something too short/garbled
// to be useful, so the caller can surface it instead of silently scoring junk.
export async function extractCvText(file) {
  const ext = (file.name.split(".").pop() || "").toLowerCase()

  try {
    if (ext === "txt") {
      const text = await file.text()
      return { text, method: "txt", warning: null }
    }
    if (ext === "pdf") {
      const text = await extractPdfText(file)
      if (!text || text.replace(/\s+/g, "").length < 50) {
        return { text, method: "pdf", warning: "This PDF's text couldn't be read cleanly - it may be a scanned image rather than real text. Try a text-based PDF or a .txt/.docx export instead." }
      }
      return { text, method: "pdf", warning: null }
    }
    if (ext === "doc" || ext === "docx") {
      if (ext === "doc") {
        return { text: "", method: "doc", warning: "Old .doc format isn't supported for text extraction - please save as .docx, .pdf or .txt and re-upload." }
      }
      const text = await extractDocxText(file)
      return { text, method: "docx", warning: text && text.length >= 50 ? null : "Couldn't extract readable text from this .docx file." }
    }
    return { text: "", method: "unknown", warning: "Unsupported file type - please upload a .pdf, .docx or .txt CV." }
  } catch (err) {
    console.error("CV extraction error:", err)
    return { text: "", method: ext, warning: "Couldn't read this file. Please try re-saving it as .txt or a standard (non-scanned) .pdf." }
  }
}
