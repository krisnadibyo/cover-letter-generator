interface GenerateCoverLetterParams {
  jobDescription: string
  companyProfile: string
  cvBuffer: Buffer
  maxWords: number
}

export async function generateCoverLetter({
  jobDescription,
  companyProfile,
  cvBuffer,
  maxWords,
}: GenerateCoverLetterParams): Promise<string> {
  try {
    // Create form data for the DeepSeek API request
    const formData = new FormData()

    // Create a Blob from the CV buffer
    const cvBlob = new Blob([cvBuffer], { type: "application/pdf" })

    // Create the prompt for the DeepSeek API
    const prompt = `
You are a professional cover letter writer. Your task is to generate a tailored cover letter based on the following information:

Job Description:
${jobDescription}

Company Profile:
${companyProfile}

The attached PDF contains the candidate's CV. Please analyze this CV carefully to:
1. Identify relevant skills and experience
2. Extract professional achievements
3. Understand the candidate's background and qualifications

The cover letter should:
1. Be professional and engaging
2. Highlight relevant experience from the CV that matches the job description
3. Demonstrate understanding of the company based on the profile
4. Include a strong opening and closing
5. Be approximately ${maxWords} words in length
6. Follow standard cover letter formatting
7. Not include any placeholders or fields to be filled in later
`

    // Add the prompt and CV file to the form data
    formData.append("prompt", prompt)
    formData.append("file", cvBlob, "cv.pdf")

    // Additional parameters for the DeepSeek API
    formData.append("model", "deepseek-chat")
    formData.append("temperature", "0.7")
    formData.append("max_tokens", "2048")

    // Make the API request to DeepSeek
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || "Failed to generate cover letter")
    }

    const data = await response.json()

    // Extract the generated cover letter from the response
    const coverLetter = data.choices[0].message.content

    return coverLetter
  } catch (error) {
    console.error("Error in DeepSeek API call:", error)
    throw new Error("Failed to generate cover letter")
  }
}

