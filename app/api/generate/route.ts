import { type NextRequest, NextResponse } from "next/server"
import formidable from "formidable"
import fs from "fs"
import { generateCoverLetter } from "@/lib/deepseek"
import { Readable } from "stream"

export const config = {
  api: {
    bodyParser: false,
  },
}

// Helper function to convert ReadableStream to Node.js Readable
function streamToNodeReadable(stream: ReadableStream): Readable {
  const reader = stream.getReader();
  const nodeReadable = new Readable({
    read() {
      reader.read().then(({ done, value }) => {
        if (done) {
          this.push(null);
        } else {
          this.push(Buffer.from(value));
        }
      }).catch(err => {
        this.destroy(err);
      });
    }
  });
  return nodeReadable;
}

export async function POST(request: NextRequest) {
  try {
    // Create a temporary directory for file processing
    const tempDir = `/tmp/cover-letter-${Date.now()}`
    fs.mkdirSync(tempDir, { recursive: true })

    // Parse the multipart form data
    const form = formidable({
      uploadDir: tempDir,
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024, // 5MB
      multiples: true,
      // Add these options to fix the content-length issue
      enabledPlugins: ['octetstream', 'querystring', 'multipart', 'json'],
      hashAlgorithm: false,
    })

    // Get the content-type header
    const contentType = request.headers.get('content-type') || '';
    
    // Convert the request body to a Node.js readable stream
    const nodeReadable = streamToNodeReadable(request.body as ReadableStream);

    // Parse the form data
    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(nodeReadable, (err, parsedFields, parsedFiles) => {
        if (err) reject(err);
        resolve([parsedFields, parsedFiles]);
      });
    });

    // Extract form data
    const jobDescription = fields.jobDescription?.[0] || ""
    const companyProfile = fields.companyProfile?.[0] || ""
    const maxWords = Number.parseInt(fields.maxWords?.[0] || "400")

    // Get the CV file
    const cvFile = files.cvFile?.[0]

    if (!cvFile) {
      return NextResponse.json({ message: "CV file is required" }, { status: 400 })
    }

    // Read the CV file
    const cvBuffer = fs.readFileSync(cvFile.filepath)

    // Generate the cover letter
    const coverLetter = await generateCoverLetter({
      jobDescription,
      companyProfile,
      cvBuffer,
      maxWords,
    })

    // Clean up temporary files
    fs.unlinkSync(cvFile.filepath)
    fs.rmdirSync(tempDir, { recursive: true })

    return NextResponse.json({ coverLetter })
  } catch (error) {
    console.error("Error generating cover letter:", error)
    return NextResponse.json({ message: "Failed to generate cover letter", error: String(error) }, { status: 500 })
  }
}

