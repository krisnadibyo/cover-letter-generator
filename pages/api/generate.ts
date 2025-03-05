import type { NextApiRequest, NextApiResponse } from "next";
import { generateCoverLetter } from "@/lib/deepseek";
import formidable from "formidable";
import { IncomingForm } from "formidable";
import fs from "fs";

// Disable the default body parser to handle form data
export const config = {
  api: {
    bodyParser: false,
  },
};

type ResponseData = {
  coverLetter?: string;
  message?: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  console.log("API ROUTE CALLED - Pages Router");

  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ message: "Method not allowed. This API expects POST requests." });
  }

  try {
    // Parse form data
    const form = new IncomingForm();
    const [fields, files] = await new Promise<
      [formidable.Fields, formidable.Files]
    >((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve([fields, files]);
      });
    });

    // Extract form data
    const jobDescription = fields.jobDescription?.[0] || "";
    const companyProfile = fields.companyProfile?.[0] || "";
    const maxWords = parseInt(fields.maxWords?.[0] || "400");

    // Get the CV file
    const cvFile = files.cvFile?.[0];
    if (!cvFile) {
      return res.status(400).json({ message: "CV file is required" });
    }

    // Read the file content
    const cvBuffer = await new Promise<Buffer>((resolve, reject) => {
      fs.readFile(
        cvFile.filepath,
        (err: NodeJS.ErrnoException | null, data: Buffer) => {
          if (err) return reject(err);
          resolve(data);
        }
      );
    });

    // Generate the cover letter without streaming
    const result = await generateCoverLetter({
      jobDescription,
      companyProfile,
      cvBuffer,
      maxWords,
      stream: false,
    });

    // Return the complete result
    return res.status(200).json({ coverLetter: result as string });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      message: "Failed to generate cover letter",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
